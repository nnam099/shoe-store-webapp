import { AppError } from "../errors/app-error.js";

function unavailableError() {
  return new AppError({
    statusCode: 409,
    code: "CART_ITEM_UNAVAILABLE",
    message: "Biến thể này không còn khả dụng.",
  });
}

function stockError(stockQuantity) {
  return new AppError({
    statusCode: 409,
    code: "CART_STOCK_EXCEEDED",
    message: "Số lượng trong giỏ vượt quá tồn kho hiện tại.",
    fields: { quantity: `Biến thể này chỉ còn ${stockQuantity} sản phẩm.` },
  });
}

function mapCartItem(row) {
  return {
    productVariantId: row.product_variant_id,
    quantity: row.quantity,
  };
}

export function createCartItemService(repository) {
  return {
    addItem({ customerId, productVariantId, quantity }) {
      return repository.withTransaction(async (client) => {
        const cart = await repository.getOrCreateLockedCart(client, customerId);
        const variants = await repository.lockVariants(client, [productVariantId]);
        const variant = variants[0];

        if (!variant?.available || variant.stock_quantity === 0) {
          throw unavailableError();
        }

        const existingItems = await repository.findCartItemQuantities(client, cart.id, [productVariantId]);
        const currentQuantity = existingItems[0]?.quantity ?? 0;
        const finalQuantity = currentQuantity + quantity;
        if (finalQuantity > variant.stock_quantity) {
          throw stockError(variant.stock_quantity);
        }

        await repository.upsertCartItem(client, {
          cartId: cart.id,
          productVariantId,
          quantity: finalQuantity,
        });
        await repository.touchCart(client, cart.id);
        const cartItems = await repository.listCartItems(client, cart.id);

        return {
          cart: { items: cartItems.map(mapCartItem) },
          item: { productVariantId, quantity: finalQuantity },
        };
      });
    },
  };
}
