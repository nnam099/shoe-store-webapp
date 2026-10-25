import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  assertAllowedFields,
  paginationResult,
  parseEnum,
  parsePagination,
  parseSearch,
  validationError,
} from '../utils/adminValidation.js';
import {
  addCalendarDays, businessDateToUtc, parseDateOnly,
} from '../config/businessTime.js';
import {
  cancelAuthorizedOrder,
  completeDeliveredOrder,
  serializeOrderTimeline,
} from './order.service.js';

const ORDER_STATUSES = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const ORDER_SORTS = ['newest', 'oldest', 'total-asc', 'total-desc'];
const CUSTOMER_TYPES = ['MEMBER', 'GUEST'];
const ALLOWED_TRANSITIONS = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const ORDER_INCLUDE = {
  user: { select: { id: true, email: true, fullName: true, phone: true } },
  orderItems: { orderBy: { id: 'asc' } },
  statusHistories: { orderBy: [{ changedAt: 'asc' }, { id: 'asc' }] },
};

function orderNotFound() {
  return new AppError('Không tìm thấy đơn hàng.', 404, 'ORDER_NOT_FOUND');
}

function transitionNotAllowed(order) {
  return new AppError(
    'Không thể cập nhật đơn hàng sang trạng thái đã chọn.',
    409,
    'ORDER_STATUS_NOT_ALLOWED',
    undefined,
    {
      currentStatus: order.status,
      allowedNextStatuses: ALLOWED_TRANSITIONS[order.status] || [],
    }
  );
}

function normalizeOrderCode(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 50) {
    throw orderNotFound();
  }
  return value.trim().toUpperCase();
}

function orderBy(sort) {
  const map = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    'total-asc': { total: 'asc' },
    'total-desc': { total: 'desc' },
  };
  return map[sort];
}

function parseCreatedAtRange(query) {
  let from;
  let to;
  try {
    from = query.from === undefined ? undefined : parseDateOnly(query.from, 'from');
    to = query.to === undefined ? undefined : parseDateOnly(query.to, 'to');
  } catch (error) {
    throw validationError(error.message);
  }
  if (from && to && businessDateToUtc(from) > businessDateToUtc(to)) {
    throw validationError('from must not be after to');
  }
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: businessDateToUtc(from) } : {}),
    ...(to ? { lt: businessDateToUtc(addCalendarDays(to, 1)) } : {}),
  };
}

function serializeOrderItems(items = []) {
  return items.map((item) => {
    const unitPrice = Math.round(Number(item.unitPrice));
    return {
      productName: item.productName,
      colorwayName: item.colorwayName,
      size: item.size,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      thumbnail: item.colorwayImage || null,
    };
  });
}

export function serializeAdminOrderListItem(order) {
  return {
    orderCode: order.orderCode,
    status: order.status,
    createdAt: order.createdAt,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    customerType: order.userId === null ? 'GUEST' : 'MEMBER',
    member: order.user ? {
      id: order.user.id,
      email: order.user.email,
      fullName: order.user.fullName,
    } : null,
    itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    total: Math.round(Number(order.total)),
    paymentMethod: order.paymentMethod,
  };
}

export function serializeAdminOrderDetail(order) {
  return {
    orderCode: order.orderCode,
    status: order.status,
    allowedNextStatuses: ALLOWED_TRANSITIONS[order.status] || [],
    customerType: order.userId === null ? 'GUEST' : 'MEMBER',
    member: order.user ? {
      id: order.user.id,
      email: order.user.email,
      fullName: order.user.fullName,
      phone: order.user.phone,
    } : null,
    receiver: {
      name: order.receiverName,
      phone: order.receiverPhone,
      address: order.receiverAddress,
    },
    note: order.note,
    paymentMethod: order.paymentMethod,
    subtotal: Math.round(Number(order.subtotal)),
    shippingFee: Math.round(Number(order.shippingFee)),
    total: Math.round(Number(order.total)),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    stockRestoredAt: order.stockRestoredAt,
    items: serializeOrderItems(order.orderItems),
    timeline: serializeOrderTimeline(order.statusHistories),
  };
}

export async function listAdminOrders(query = {}) {
  const { page, limit } = parsePagination(query);
  const q = parseSearch(query.q);
  const status = parseEnum(query.status, ORDER_STATUSES, 'status');
  const customerType = parseEnum(query.customerType, CUSTOMER_TYPES, 'customerType');
  const sort = parseEnum(query.sort, ORDER_SORTS, 'sort', 'newest');
  const createdAt = parseCreatedAtRange(query);
  const where = {
    ...(status ? { status } : {}),
    ...(customerType === 'MEMBER' ? { userId: { not: null } } : {}),
    ...(customerType === 'GUEST' ? { userId: null } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? {
      OR: [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { receiverName: { contains: q, mode: 'insensitive' } },
        { receiverPhone: { contains: q } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: [orderBy(sort), { id: sort === 'oldest' || sort === 'total-asc' ? 'asc' : 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        orderItems: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: items.map(serializeAdminOrderListItem),
    pagination: paginationResult(page, limit, totalItems),
  };
}

export async function getAdminOrder(rawOrderCode) {
  const orderCode = normalizeOrderCode(rawOrderCode);
  const order = await prisma.order.findUnique({ where: { orderCode }, include: ORDER_INCLUDE });
  if (!order) throw orderNotFound();
  return serializeAdminOrderDetail(order);
}

export async function updateAdminOrderStatus(rawOrderCode, input) {
  const orderCode = normalizeOrderCode(rawOrderCode);
  assertAllowedFields(input, ['status']);
  const targetStatus = parseEnum(input.status, ORDER_STATUSES, 'status');
  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: { id: true, status: true },
  });
  if (!order) throw orderNotFound();
  if (!(ALLOWED_TRANSITIONS[order.status] || []).includes(targetStatus)) {
    throw transitionNotAllowed(order);
  }

  try {
    if (targetStatus === 'CANCELLED') {
      await cancelAuthorizedOrder(order.id);
    } else if (targetStatus === 'COMPLETED') {
      await completeDeliveredOrder(order.id);
    } else {
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: targetStatus,
            ...(targetStatus === 'DELIVERED' ? { deliveredAt: now } : {}),
          },
        });
        if (updated.count !== 1) throw transitionNotAllowed(order);
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, status: targetStatus, changedAt: now },
        });
      });
    }
  } catch (error) {
    if (['ORDER_NOT_CANCELLABLE', 'ORDER_NOT_CONFIRMABLE'].includes(error?.code)) {
      throw transitionNotAllowed(order);
    }
    throw error;
  }

  return getAdminOrder(orderCode);
}
