import prisma from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  paginationResult,
  parseBoolean,
  parseEnum,
  parseId,
  parsePagination,
  parseSearch,
} from '../utils/adminValidation.js';
import { serializeAdminOrderListItem } from './admin-order.service.js';

const CUSTOMER_SORTS = [
  'newest', 'oldest', 'name-asc', 'name-desc', 'email-asc', 'email-desc', 'order-count-desc',
];
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const ORDER_SORTS = ['newest', 'oldest', 'total-asc', 'total-desc'];

function customerNotFound() {
  return new AppError('Không tìm thấy khách hàng.', 404, 'CUSTOMER_NOT_FOUND');
}

function customerOrderBy(sort) {
  const map = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    'name-asc': { fullName: 'asc' },
    'name-desc': { fullName: 'desc' },
    'email-asc': { email: 'asc' },
    'email-desc': { email: 'desc' },
    'order-count-desc': { orders: { _count: 'desc' } },
  };
  return map[sort];
}

function orderOrderBy(sort) {
  const map = {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    'total-asc': { total: 'asc' },
    'total-desc': { total: 'desc' },
  };
  return map[sort];
}

function serializeCustomer(customer) {
  return {
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export async function listAdminCustomers(query = {}) {
  const { page, limit } = parsePagination(query);
  const q = parseSearch(query.q);
  const hasOrders = parseBoolean(query.hasOrders, 'hasOrders');
  const sort = parseEnum(query.sort, CUSTOMER_SORTS, 'sort', 'newest');
  const where = {
    ...(hasOrders === true ? { orders: { some: {} } } : {}),
    ...(hasOrders === false ? { orders: { none: {} } } : {}),
    ...(q ? {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [customerOrderBy(sort), { id: sort === 'oldest' ? 'asc' : 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((customer) => ({
      ...serializeCustomer(customer),
      orderCount: customer._count.orders,
    })),
    pagination: paginationResult(page, limit, totalItems),
  };
}

export async function getAdminCustomer(rawCustomerId) {
  const customerId = parseId(rawCustomerId, 'customerId');
  const [customer, totalOrders, completed, lastOrder] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: customerId } }),
    prisma.order.count({ where: { userId: customerId } }),
    prisma.order.aggregate({
      where: { userId: customerId, status: 'COMPLETED' },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.findFirst({
      where: { userId: customerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { createdAt: true },
    }),
  ]);
  if (!customer) throw customerNotFound();

  return {
    customer: serializeCustomer(customer),
    summary: {
      totalOrders,
      completedOrders: completed._count._all,
      completedSpend: Math.round(Number(completed._sum.total ?? 0)),
      lastOrderAt: lastOrder?.createdAt ?? null,
    },
  };
}

export async function listAdminCustomerOrders(rawCustomerId, query = {}) {
  const customerId = parseId(rawCustomerId, 'customerId');
  const { page, limit } = parsePagination(query);
  const status = parseEnum(query.status, ORDER_STATUSES, 'status');
  const sort = parseEnum(query.sort, ORDER_SORTS, 'sort', 'newest');
  const customer = await prisma.user.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw customerNotFound();
  const where = { userId: customerId, ...(status ? { status } : {}) };

  const [items, totalItems] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: [orderOrderBy(sort), { id: sort === 'oldest' || sort === 'total-asc' ? 'asc' : 'desc' }],
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
