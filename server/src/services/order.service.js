import prisma from '../config/db.js';
import { getShippingFee } from '../config/shipping.js';
import { AppError } from '../utils/errors.js';
import { generateOrderCode } from '../utils/orderCode.js';

/**
 * Validates phone number according to practical requirements:
 * - 7 to 20 characters length
 * - Contains only digits, +, -, (, ), spaces, and .
 * - Contains between 8 and 15 actual digits
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (trimmed.length < 7 || trimmed.length > 20) return false;
  if (!/^[0-9+\s\-().]+$/.test(trimmed)) return false;
  const digitCount = (trimmed.match(/\d/g) || []).length;
  return digitCount >= 8 && digitCount <= 15;
}

/**
 * Normalizes input items:
 * - Validates basic field types
 * - Merges duplicates with identical (productSlug, colorwaySlug, size) tuple
 */
export function normalizeItems(rawItems, options = {}) {
  const { requireExpectedPrice = false } = options;

  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    throw new AppError('Items must be a non-empty array with at most 50 items', 400, 'VALIDATION_ERROR');
  }

  const map = new Map();

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== 'object') {
      throw new AppError(`Item at index ${i} is invalid`, 400, 'VALIDATION_ERROR');
    }

    const { productSlug, colorwaySlug, size, quantity, expectedUnitPrice } = item;

    if (!productSlug || typeof productSlug !== 'string' || !productSlug.trim()) {
      throw new AppError(`Item at index ${i} has invalid productSlug`, 400, 'VALIDATION_ERROR');
    }
    if (!colorwaySlug || typeof colorwaySlug !== 'string' || !colorwaySlug.trim()) {
      throw new AppError(`Item at index ${i} has invalid colorwaySlug`, 400, 'VALIDATION_ERROR');
    }
    if (!size || typeof size !== 'string' || !size.trim()) {
      throw new AppError(`Item at index ${i} has invalid size`, 400, 'VALIDATION_ERROR');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError(`Item at index ${i} must have integer quantity >= 1`, 400, 'VALIDATION_ERROR');
    }

    if (requireExpectedPrice) {
      if (
        expectedUnitPrice === undefined ||
        expectedUnitPrice === null ||
        !Number.isInteger(expectedUnitPrice) ||
        expectedUnitPrice < 0 ||
        expectedUnitPrice > 1000000000
      ) {
        throw new AppError(`Item at index ${i} has invalid expectedUnitPrice (must be integer >= 0)`, 400, 'VALIDATION_ERROR');
      }
    }

    const pSlug = productSlug.trim();
    const cSlug = colorwaySlug.trim();
    const s = size.trim();
    const key = `${pSlug}:::${cSlug}:::${s}`;

    if (map.has(key)) {
      const existing = map.get(key);
      if (requireExpectedPrice && existing.expectedUnitPrice !== expectedUnitPrice) {
        throw new AppError(
          `Conflicting expectedUnitPrice for duplicate item (${pSlug}, ${cSlug}, ${s})`,
          400,
          'VALIDATION_ERROR'
        );
      }
      existing.quantity += quantity;
    } else {
      map.set(key, {
        productSlug: pSlug,
        colorwaySlug: cSlug,
        size: s,
        quantity,
        ...(expectedUnitPrice !== undefined ? { expectedUnitPrice } : {}),
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Resolves normalized items against database catalog and verifies active sellability.
 */
export async function resolveCatalogItems(items, dbClient = prisma) {
  const resolved = [];
  const issues = [];

  for (const item of items) {
    const product = await dbClient.product.findUnique({
      where: { slug: item.productSlug },
      include: {
        brand: true,
        colorways: {
          where: { slug: item.colorwaySlug },
          include: {
            variants: {
              where: { size: item.size },
            },
            images: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!product) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'PRODUCT_NOT_FOUND',
      });
      continue;
    }

    if (!product.isActive) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'PRODUCT_INACTIVE',
      });
      continue;
    }

    if (!product.brand || !product.brand.isActive) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'BRAND_INACTIVE',
      });
      continue;
    }

    const colorway = product.colorways?.[0];
    if (!colorway) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'COLORWAY_NOT_FOUND',
      });
      continue;
    }

    if (!colorway.isActive) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'COLORWAY_INACTIVE',
      });
      continue;
    }

    const variant = colorway.variants?.[0];
    if (!variant) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: 0,
        reason: 'VARIANT_NOT_FOUND',
      });
      continue;
    }

    if (variant.stock < item.quantity) {
      issues.push({
        productSlug: item.productSlug,
        colorwaySlug: item.colorwaySlug,
        size: item.size,
        requestedQuantity: item.quantity,
        availableStock: variant.stock,
        reason: 'INSUFFICIENT_STOCK',
      });
      continue;
    }

    // Sellable item
    const unitPrice = Number(colorway.salePrice ?? colorway.price);
    const lineTotal = unitPrice * item.quantity;
    const thumbnail = colorway.images.find((img) => img.isThumbnail)?.imageUrl || colorway.images[0]?.imageUrl || null;

    resolved.push({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      colorwaySlug: colorway.slug,
      colorwayName: colorway.name,
      size: variant.size,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      colorwayImage: thumbnail,
      expectedUnitPrice: item.expectedUnitPrice,
    });
  }

  return { resolved, issues };
}

/**
 * Computes authoritative checkout quote.
 */
export async function computeCheckoutQuote(rawItems) {
  const normalized = normalizeItems(rawItems);
  const { resolved, issues } = await resolveCatalogItems(normalized);

  if (issues.length > 0) {
    throw new AppError(
      'One or more items are unavailable for checkout',
      409,
      'CHECKOUT_UNAVAILABLE',
      issues
    );
  }

  const subtotal = resolved.reduce((acc, it) => acc + it.lineTotal, 0);
  const shippingFee = getShippingFee();
  const total = subtotal + shippingFee;

  return {
    items: resolved.map((it) => ({
      productSlug: it.productSlug,
      productName: it.productName,
      colorwaySlug: it.colorwaySlug,
      colorwayName: it.colorwayName,
      size: it.size,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      thumbnail: it.colorwayImage,
    })),
    subtotal,
    shippingFee,
    total,
    paymentMethod: 'COD',
  };
}

/**
 * Creates a Guest Order atomically in PostgreSQL.
 */
export async function createGuestOrder(orderInput, options = {}) {
  const { codeGenerator = generateOrderCode } = options;
  const {
    receiverName,
    receiverPhone,
    receiverAddress,
    note,
    items: rawItems,
    expectedShippingFee,
  } = orderInput;

  // 1. Basic receiver validation
  if (!receiverName || typeof receiverName !== 'string' || !receiverName.trim() || receiverName.trim().length > 100) {
    throw new AppError('Receiver name is required and must be between 1 and 100 characters', 400, 'VALIDATION_ERROR');
  }

  if (!isValidPhone(receiverPhone)) {
    throw new AppError('Receiver phone is required and must be a valid practical phone number (8-15 digits)', 400, 'VALIDATION_ERROR');
  }

  if (!receiverAddress || typeof receiverAddress !== 'string' || !receiverAddress.trim()) {
    throw new AppError('Receiver address is required', 400, 'VALIDATION_ERROR');
  }

  // expectedShippingFee is strictly REQUIRED
  if (
    expectedShippingFee === undefined ||
    expectedShippingFee === null ||
    !Number.isInteger(expectedShippingFee) ||
    expectedShippingFee < 0
  ) {
    throw new AppError('expectedShippingFee is required and must be an integer >= 0', 400, 'VALIDATION_ERROR');
  }

  const trimmedReceiverName = receiverName.trim();
  const trimmedReceiverPhone = receiverPhone.trim();
  const trimmedReceiverAddress = receiverAddress.trim();
  const trimmedNote = note ? String(note).trim() : null;

  // 2. Normalize items (enforcing required expectedUnitPrice on every item)
  const normalized = normalizeItems(rawItems, { requireExpectedPrice: true });

  // 3. Execute whole-order creation in a single Prisma transaction with outer retry for orderCode collision
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const orderCode = codeGenerator();

    try {
      return await prisma.$transaction(async (tx) => {
        // 3a. Revalidate catalog sellability inside transaction
        const { resolved, issues } = await resolveCatalogItems(normalized, tx);

        if (issues.length > 0) {
          throw new AppError(
            'One or more items are unavailable for checkout',
            409,
            'CHECKOUT_UNAVAILABLE',
            issues
          );
        }

        const subtotal = resolved.reduce((acc, it) => acc + it.lineTotal, 0);
        const shippingFee = getShippingFee();
        const total = subtotal + shippingFee;

        // Fresh quote for CHECKOUT_CHANGED details
        const freshQuote = {
          items: resolved.map((it) => ({
            productSlug: it.productSlug,
            productName: it.productName,
            colorwaySlug: it.colorwaySlug,
            colorwayName: it.colorwayName,
            size: it.size,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            thumbnail: it.colorwayImage,
          })),
          subtotal,
          shippingFee,
          total,
          paymentMethod: 'COD',
        };

        // 3b. CHECKOUT_CHANGED: verify expectedShippingFee BEFORE any stock decrement
        if (expectedShippingFee !== shippingFee) {
          throw new AppError(
            'Shipping fee has changed since last quote',
            409,
            'CHECKOUT_CHANGED',
            [{ expectedShippingFee, currentShippingFee: shippingFee }],
            { quote: freshQuote }
          );
        }

        // 3c. CHECKOUT_CHANGED: verify expectedUnitPrice for items BEFORE any stock decrement
        const priceMismatches = [];
        for (const it of resolved) {
          if (it.expectedUnitPrice !== it.unitPrice) {
            priceMismatches.push({
              productSlug: it.productSlug,
              colorwaySlug: it.colorwaySlug,
              size: it.size,
              expectedUnitPrice: it.expectedUnitPrice,
              currentUnitPrice: it.unitPrice,
            });
          }
        }

        if (priceMismatches.length > 0) {
          throw new AppError(
            'Product price has changed since last quote',
            409,
            'CHECKOUT_CHANGED',
            priceMismatches,
            { quote: freshQuote }
          );
        }

        // 3d. Atomic conditional stock decrement for all items
        for (const it of resolved) {
          const updateResult = await tx.variant.updateMany({
            where: {
              id: it.variantId,
              stock: { gte: it.quantity },
            },
            data: {
              stock: { decrement: it.quantity },
            },
          });

          if (updateResult.count === 0) {
            const currentVariant = await tx.variant.findUnique({
              where: { id: it.variantId },
            });

            throw new AppError(
              `Insufficient stock for ${it.productName} (${it.colorwayName}, Size ${it.size})`,
              409,
              'INSUFFICIENT_STOCK',
              [{
                productSlug: it.productSlug,
                colorwaySlug: it.colorwaySlug,
                size: it.size,
                requestedQuantity: it.quantity,
                availableStock: currentVariant ? currentVariant.stock : 0,
                reason: 'INSUFFICIENT_STOCK',
              }]
            );
          }
        }

        // 3e. Create Order + OrderItems + OrderStatusHistory
        const createdOrder = await tx.order.create({
          data: {
            orderCode,
            userId: null, // GUEST ORDER: ALWAYS NULL
            status: 'PENDING',
            paymentMethod: 'COD',
            receiverName: trimmedReceiverName,
            receiverPhone: trimmedReceiverPhone,
            receiverAddress: trimmedReceiverAddress,
            note: trimmedNote,
            subtotal,
            shippingFee,
            total,
            orderItems: {
              create: resolved.map((it) => ({
                variantId: it.variantId,
                productName: it.productName,
                colorwayName: it.colorwayName,
                size: it.size,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                colorwayImage: it.colorwayImage,
              })),
            },
            statusHistories: {
              create: {
                status: 'PENDING',
              },
            },
          },
          include: {
            orderItems: true,
          },
        });

        // 3f. Return committed order representation
        return {
          orderCode: createdOrder.orderCode,
          status: createdOrder.status,
          subtotal: Number(createdOrder.subtotal),
          shippingFee: Number(createdOrder.shippingFee),
          total: Number(createdOrder.total),
          paymentMethod: createdOrder.paymentMethod,
          items: createdOrder.orderItems.map((oi) => ({
            productName: oi.productName,
            colorwayName: oi.colorwayName,
            size: oi.size,
            unitPrice: Number(oi.unitPrice),
            quantity: oi.quantity,
            lineTotal: Number(oi.unitPrice) * oi.quantity,
            colorwayImage: oi.colorwayImage,
          })),
        };
      });
    } catch (err) {
      // Only retry if it is a unique collision specifically on order_code
      const isOrderCodeCollision =
        err.code === 'P2002' &&
        (err.message?.includes('order_code') ||
         err.message?.includes('orders_order_code_key') ||
         err.meta?.target?.includes('order_code') ||
         err.meta?.target?.includes('orderCode'));

      if (isOrderCodeCollision) {
        if (attempt === MAX_RETRIES - 1) {
          throw new AppError('Unable to generate unique order code after multiple attempts', 500, 'ORDER_CODE_GENERATION_FAILED');
        }
        continue; // Retries with a brand new transaction and fresh code
      }

      // Any other error (AppError, DB error, etc.) must not retry, re-throw immediately
      throw err;
    }
  }
}

/**
 * Strips formatting characters (spaces, -, (, ), .) for phone comparison.
 * Preserves actual characters (such as leading +, digits) without country-code transformation.
 */
export function stripPhoneFormatting(phone) {
  if (typeof phone !== 'string') return '';
  return phone.trim().replace(/[\s\-().]/g, '');
}

/**
 * Compares stored receiverPhone with input phone.
 * Returns true if stripped versions match exactly.
 */
export function isPhoneMatch(storedPhone, inputPhone) {
  if (!storedPhone || !inputPhone) return false;
  return stripPhoneFormatting(storedPhone) === stripPhoneFormatting(inputPhone);
}

/**
 * Serializes an Order into a privacy-preserving, Guest-safe public representation.
 * Explicitly omits: receiverName, receiverAddress, receiverPhone, receiverPhoneMasked, note, userId, internal IDs.
 */
export function serializePublicOrder(order) {
  const isCancellable =
    (order.status === 'PENDING' || order.status === 'PREPARING') &&
    order.stockRestoredAt === null;

  return {
    orderCode: order.orderCode,
    status: order.status,
    createdAt: order.createdAt,
    cancelledAt: order.cancelledAt,
    subtotal: Math.round(Number(order.subtotal)),
    shippingFee: Math.round(Number(order.shippingFee)),
    total: Math.round(Number(order.total)),
    paymentMethod: order.paymentMethod,
    cancellable: isCancellable,
    items: (order.orderItems || []).map((item) => {
      const unitPrice = Math.round(Number(item.unitPrice));
      const quantity = item.quantity;
      const lineTotal = unitPrice * quantity;
      return {
        productName: item.productName,
        colorwayName: item.colorwayName,
        size: item.size,
        unitPrice,
        quantity,
        lineTotal,
        thumbnail: item.colorwayImage || null,
      };
    }),
  };
}

/**
 * Looks up a guest order by orderCode and receiverPhone.
 * Enforces privacy protection (anti-enumeration) by returning neutral 404 for wrong code or mismatched phone.
 */
export async function lookupGuestOrder({ orderCode, receiverPhone }) {
  if (typeof orderCode !== 'string' || !orderCode.trim()) {
    throw new AppError('orderCode is required', 400, 'VALIDATION_ERROR');
  }
  const trimmedCode = orderCode.trim();
  if (trimmedCode.length > 50) {
    throw new AppError('orderCode exceeds maximum length', 400, 'VALIDATION_ERROR');
  }

  if (typeof receiverPhone !== 'string' || !receiverPhone.trim()) {
    throw new AppError('receiverPhone is required', 400, 'VALIDATION_ERROR');
  }
  const trimmedPhone = receiverPhone.trim();
  if (!isValidPhone(trimmedPhone)) {
    throw new AppError('receiverPhone is invalid', 400, 'VALIDATION_ERROR');
  }

  const normalizedOrderCode = trimmedCode.toUpperCase();

  const order = await prisma.order.findUnique({
    where: { orderCode: normalizedOrderCode },
    include: {
      orderItems: true,
    },
  });

  if (!order || !isPhoneMatch(order.receiverPhone, trimmedPhone)) {
    throw new AppError('Không tìm thấy đơn hàng với thông tin đã cung cấp.', 404, 'ORDER_NOT_FOUND');
  }

  return serializePublicOrder(order);
}

/**
 * Cancels a guest order atomically.
 * Validates possession, checks eligibility (PENDING or PREPARING and stockRestoredAt === null),
 * updates status to CANCELLED, restores Variant stock by OrderItem quantity,
 * and logs an OrderStatusHistory record in a single transaction.
 */
export async function cancelGuestOrder({ orderCode, receiverPhone }) {
  if (typeof orderCode !== 'string' || !orderCode.trim()) {
    throw new AppError('orderCode is required', 400, 'VALIDATION_ERROR');
  }
  const trimmedCode = orderCode.trim();
  if (trimmedCode.length > 50) {
    throw new AppError('orderCode exceeds maximum length', 400, 'VALIDATION_ERROR');
  }

  if (typeof receiverPhone !== 'string' || !receiverPhone.trim()) {
    throw new AppError('receiverPhone is required', 400, 'VALIDATION_ERROR');
  }
  const trimmedPhone = receiverPhone.trim();
  if (!isValidPhone(trimmedPhone)) {
    throw new AppError('receiverPhone is invalid', 400, 'VALIDATION_ERROR');
  }

  const normalizedOrderCode = trimmedCode.toUpperCase();

  const order = await prisma.order.findUnique({
    where: { orderCode: normalizedOrderCode },
    include: {
      orderItems: true,
    },
  });

  if (!order || !isPhoneMatch(order.receiverPhone, trimmedPhone)) {
    throw new AppError('Không tìm thấy đơn hàng với thông tin đã cung cấp.', 404, 'ORDER_NOT_FOUND');
  }

  // Pre-transaction check for clear failure if order is already non-cancellable
  const isCancellable =
    (order.status === 'PENDING' || order.status === 'PREPARING') &&
    order.stockRestoredAt === null;

  if (!isCancellable) {
    throw new AppError('Đơn hàng không thể hủy ở trạng thái hiện tại.', 409, 'ORDER_NOT_CANCELLABLE');
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Conditional transition (compare-and-set)
    const updateResult = await tx.order.updateMany({
      where: {
        id: order.id,
        status: { in: ['PENDING', 'PREPARING'] },
        stockRestoredAt: null,
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        stockRestoredAt: now,
      },
    });

    if (updateResult.count === 0) {
      throw new AppError('Đơn hàng không thể hủy ở trạng thái hiện tại.', 409, 'ORDER_NOT_CANCELLABLE');
    }

    // Restore stock based ONLY on OrderItem.variantId and OrderItem.quantity
    for (const item of order.orderItems) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: {
          stock: { increment: item.quantity },
        },
      });
    }

    // Create exactly one OrderStatusHistory record
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'CANCELLED',
        changedAt: now,
      },
    });

    return {
      orderCode: order.orderCode,
      status: 'CANCELLED',
      cancelledAt: now,
      cancellable: false,
    };
  });
}
