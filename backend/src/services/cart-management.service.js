import { toPublicImagePath } from "../utils/product-image.js";
import { AppError } from "../errors/app-error.js";

function itemNotFoundError() {
  return new AppError({
    statusCode: 404,
    code: "CART_ITEM_NOT_FOUND",
    message: "Không tìm thấy dòng giỏ hàng.",
  });
}

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

function aggregateItems(items) {
  const quantities = new Map();

  for (const item of items) {
    quantities.set(
      item.productVariantId,
      (quantities.get(item.productVariantId) ?? 0) + item.quantity,
    );
  }

  return [...quantities.entries()].map(([productVariantId, quantity]) => ({
    productVariantId,
    quantity,
  }));
}

function getAvailability(detail, quantity) {
  if (!detail || detail.variant_deleted_at || detail.product_deleted_at) {
    return {
      status: "not_for_sale",
      message: "Sản phẩm hoặc biến thể không còn bán.",
    };
  }

  if (detail.stock_quantity === 0) {
    return {
      status: "out_of_stock",
      message: "Biến thể này đã hết hàng.",
    };
  }

  if (quantity > detail.stock_quantity) {
    return {
      status: "insufficient_stock",
      message: `Biến thể này chỉ còn ${detail.stock_quantity} sản phẩm.`,
    };
  }

  return { status: "available", message: null };
}

function mapCartItem(item, detail) {
  const availability = getAvailability(detail, item.quantity);
  const unitPrice = detail ? Number(detail.sale_price ?? detail.price) : null;

  return {
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    product: detail
      ? {
          id: detail.product_id,
          name: detail.product_name,
          slug: detail.product_slug,
          mainImage: detail.image_path ? toPublicImagePath(detail.image_path) : null,
        }
      : null,
    variant: detail
      ? {
          size: { id: detail.size_id, value: detail.size_value },
          color: {
            id: detail.color_id,
            name: detail.color_name,
            hexCode: detail.hex_code,
          },
        }
      : null,
    unitPrice,
    lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
    stockQuantity: detail?.stock_quantity ?? null,
    ...availability,
  };
}

function buildCart(items, details) {
  const detailsById = new Map(details.map((detail) => [detail.product_variant_id, detail]));
  const mappedItems = items.map((item) => mapCartItem(item, detailsById.get(item.productVariantId)));

  return {
    items: mappedItems,
    subtotal: mappedItems.reduce(
      (total, item) => total + (item.status === "available" ? item.lineTotal : 0),
      0,
    ),
    totalQuantity: mappedItems.reduce((total, item) => total + item.quantity, 0),
    hasUnavailableItems: mappedItems.some((item) => item.status !== "available"),
  };
}

export function createCartManagementService(repository) {
  async function getCart(items) {
    const normalizedItems = aggregateItems(items);
    const details = await repository.findVariantDetails(
      normalizedItems.map((item) => item.productVariantId),
    );
    return buildCart(normalizedItems, details);
  }

  async function getCustomerCart(customerId) {
    const items = (await repository.findCustomerCartItems(customerId)).map((item) => ({
      productVariantId: item.product_variant_id,
      quantity: item.quantity,
    }));
    return { cart: await getCart(items) };
  }

  return {
    async validateGuestCart(items) {
      return { cart: await getCart(items) };
    },

    getCustomerCart,

    async updateCustomerItem({ customerId, productVariantId, quantity }) {
      await repository.withTransaction(async (client) => {
        const cart = await repository.findLockedCustomerCart(client, customerId);
        if (!cart) {
          throw itemNotFoundError();
        }

        const item = await repository.findLockedCartItem(client, {
          cartId: cart.id,
          productVariantId,
        });
        if (!item) {
          throw itemNotFoundError();
        }

        const variants = await repository.lockVariants(client, [productVariantId]);
        const variant = variants[0];
        if (!variant?.available || variant.stock_quantity === 0) {
          throw unavailableError();
        }
        if (quantity > variant.stock_quantity) {
          throw stockError(variant.stock_quantity);
        }

        await repository.updateCartItemQuantity(client, {
          cartId: cart.id,
          productVariantId,
          quantity,
        });
        await repository.touchCart(client, cart.id);
      });

      return getCustomerCart(customerId);
    },

    async deleteCustomerItem({ customerId, productVariantId }) {
      await repository.withTransaction(async (client) => {
        const cart = await repository.findLockedCustomerCart(client, customerId);
        if (!cart) {
          return;
        }

        const deletedCount = await repository.deleteCartItem(client, {
          cartId: cart.id,
          productVariantId,
        });
        if (deletedCount > 0) {
          await repository.touchCart(client, cart.id);
        }
      });

      return getCustomerCart(customerId);
    },
  };
}
