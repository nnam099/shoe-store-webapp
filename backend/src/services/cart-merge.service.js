function aggregateItems(items) {
  const quantities = new Map();

  for (const item of items) {
    quantities.set(
      item.productVariantId,
      (quantities.get(item.productVariantId) ?? 0) + item.quantity,
    );
  }

  return [...quantities.entries()]
    .map(([productVariantId, quantity]) => ({ productVariantId, quantity }))
    .sort((left, right) => BigInt(left.productVariantId) < BigInt(right.productVariantId) ? -1 : 1);
}

function mapCartItem(row) {
  return {
    productVariantId: row.product_variant_id,
    quantity: row.quantity,
  };
}

export function createCartMergeService(cartRepository) {
  return {
    mergeGuestCart({ customerId, items }) {
      const aggregatedItems = aggregateItems(items);
      const variantIds = aggregatedItems.map((item) => item.productVariantId);

      return cartRepository.withTransaction(async (client) => {
        const cart = await cartRepository.getOrCreateLockedCart(client, customerId);
        const [variants, existingItems] = await Promise.all([
          cartRepository.lockVariants(client, variantIds),
          cartRepository.findCartItemQuantities(client, cart.id, variantIds),
        ]);
        const variantById = new Map(variants.map((variant) => [variant.id, variant]));
        const existingById = new Map(
          existingItems.map((item) => [item.product_variant_id, item.quantity]),
        );
        const adjustments = [];

        for (const item of aggregatedItems) {
          const variant = variantById.get(item.productVariantId);
          const previousQuantity = existingById.get(item.productVariantId) ?? 0;

          if (!variant?.available || variant.stock_quantity === 0) {
            if (previousQuantity > 0) {
              await cartRepository.deleteCartItem(client, {
                cartId: cart.id,
                productVariantId: item.productVariantId,
              });
            }
            adjustments.push({
              productVariantId: item.productVariantId,
              requestedQuantity: item.quantity,
              previousQuantity,
              finalQuantity: 0,
              status: "unavailable",
            });
            continue;
          }

          const combinedQuantity = previousQuantity + item.quantity;
          const finalQuantity = Math.min(combinedQuantity, variant.stock_quantity);
          await cartRepository.upsertCartItem(client, {
            cartId: cart.id,
            productVariantId: item.productVariantId,
            quantity: finalQuantity,
          });
          adjustments.push({
            productVariantId: item.productVariantId,
            requestedQuantity: item.quantity,
            previousQuantity,
            finalQuantity,
            status: finalQuantity < combinedQuantity ? "capped" : "merged",
          });
        }

        await cartRepository.touchCart(client, cart.id);
        const cartItems = await cartRepository.listCartItems(client, cart.id);

        return {
          cart: { items: cartItems.map(mapCartItem) },
          adjustments,
        };
      });
    },
  };
}
