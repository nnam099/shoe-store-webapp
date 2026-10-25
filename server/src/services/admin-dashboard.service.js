import prisma from '../config/db.js';
import {
  BUSINESS_TIME_ZONE,
  addCalendarDays,
  businessDateRange,
  businessDateToUtc,
  formatBusinessDate,
  parseDateOnly,
} from '../config/businessTime.js';
import { parseEnum, validationError } from '../utils/adminValidation.js';
import { listCompletedProductSales } from './product-sales.service.js';

const REVENUE_GROUPS = ['day', 'week', 'month'];
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

function parseLimit(value, field, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw validationError(`${field} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw validationError(`${field} must not exceed ${maximum}`);
  }
  return parsed;
}

function safeParseDate(value, field) {
  try {
    return parseDateOnly(value, field);
  } catch (error) {
    throw validationError(error.message);
  }
}

function calendarValue(date) {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function startOfWeek(date) {
  const dayOfWeek = new Date(calendarValue(date)).getUTCDay();
  return addCalendarDays(date, -((dayOfWeek + 6) % 7));
}

function firstOfMonth(date) {
  return { ...date, day: 1, text: `${date.year}-${pad(date.month)}-01` };
}

function addCalendarMonths(date, amount) {
  const result = new Date(Date.UTC(date.year, date.month - 1 + amount, 1));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: 1,
    text: `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-01`,
  };
}

function bucketKey(date, groupBy) {
  if (groupBy === 'day') return date.text;
  if (groupBy === 'week') return startOfWeek(date).text;
  return `${date.year}-${pad(date.month)}`;
}

function buildBucketKeys(from, to, groupBy) {
  const keys = [];
  if (groupBy === 'day') {
    for (let cursor = from; calendarValue(cursor) <= calendarValue(to); cursor = addCalendarDays(cursor, 1)) {
      keys.push(cursor.text);
    }
    return keys;
  }
  if (groupBy === 'week') {
    for (let cursor = startOfWeek(from); calendarValue(cursor) <= calendarValue(to); cursor = addCalendarDays(cursor, 7)) {
      keys.push(cursor.text);
    }
    return keys;
  }
  for (let cursor = firstOfMonth(from); calendarValue(cursor) <= calendarValue(to); cursor = addCalendarMonths(cursor, 1)) {
    keys.push(`${cursor.year}-${pad(cursor.month)}`);
  }
  return keys;
}

function resolveRevenueRange(query, groupBy, now) {
  if ((query.from === undefined) !== (query.to === undefined)) {
    throw validationError('from and to must be provided together');
  }
  if (query.from !== undefined) {
    const from = safeParseDate(query.from, 'from');
    const to = safeParseDate(query.to, 'to');
    if (calendarValue(from) > calendarValue(to)) throw validationError('from must not be after to');
    const spanDays = (calendarValue(to) - calendarValue(from)) / (24 * 60 * 60 * 1000);
    if (spanDays > 3660) throw validationError('Revenue range must not exceed 3660 days');
    return { from, to };
  }

  const today = safeParseDate(formatBusinessDate(now), 'today');
  if (groupBy === 'day') return { from: addCalendarDays(today, -29), to: today };
  if (groupBy === 'week') return { from: addCalendarDays(startOfWeek(today), -77), to: today };
  return { from: addCalendarMonths(firstOfMonth(today), -11), to: today };
}

export async function getAdminDashboardSummary(query = {}, { now = new Date() } = {}) {
  const topLimit = parseLimit(query.topLimit, 'topLimit', 5, 20);
  const lowStockLimit = parseLimit(query.lowStockLimit, 'lowStockLimit', 20, 100);
  const today = formatBusinessDate(now);
  const todayRange = businessDateRange(today);

  const [
    revenueToday,
    ordersToday,
    totalProducts,
    totalMembers,
    statusGroups,
    completedProductSales,
    lowStockVariants,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: todayRange.start, lt: todayRange.end },
      },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: todayRange.start, lt: todayRange.end } } }),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    listCompletedProductSales(),
    prisma.variant.findMany({
      where: { stock: { lte: 3 } },
      orderBy: [{ stock: 'asc' }, { id: 'asc' }],
      take: lowStockLimit,
      include: {
        colorway: {
          select: {
            id: true,
            name: true,
            isActive: true,
            product: { select: { id: true, slug: true, name: true, isActive: true } },
          },
        },
      },
    }),
  ]);

  const soldProducts = completedProductSales.length === 0 ? [] : await prisma.product.findMany({
    where: { id: { in: completedProductSales.map((entry) => entry.productId) } },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: { select: { name: true } },
    },
  });
  const productById = new Map(soldProducts.map((product) => [product.id, product]));
  const bestSellingProducts = completedProductSales
    .map((entry) => ({ ...entry, product: productById.get(entry.productId) }))
    .filter((entry) => entry.product)
    .slice(0, topLimit)
    .map(({ productId, product, quantitySold }) => ({
      productId,
      slug: product.slug,
      name: product.name,
      brandName: product.brand.name,
      quantitySold,
    }));

  const orderStatusCounts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  for (const group of statusGroups) orderStatusCounts[group.status] = group._count._all;

  return {
    timezone: BUSINESS_TIME_ZONE,
    generatedAt: now,
    kpis: {
      revenueToday: Math.round(Number(revenueToday._sum.total ?? 0)),
      ordersToday,
      totalProducts,
      totalMembers,
    },
    orderStatusCounts,
    bestSellingProducts,
    lowStockVariants: lowStockVariants.map((variant) => ({
      variantId: variant.id,
      size: variant.size,
      stock: variant.stock,
      product: variant.colorway.product,
      colorway: {
        id: variant.colorway.id,
        name: variant.colorway.name,
        isActive: variant.colorway.isActive,
      },
    })),
  };
}

export async function getAdminRevenueChart(query = {}, { now = new Date() } = {}) {
  const groupBy = parseEnum(query.groupBy, REVENUE_GROUPS, 'groupBy', 'day');
  const { from, to } = resolveRevenueRange(query, groupBy, now);
  const start = businessDateToUtc(from);
  const end = businessDateToUtc(addCalendarDays(to, 1));
  const orders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: start, lt: end },
    },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    select: { completedAt: true, total: true },
  });

  const aggregate = new Map(buildBucketKeys(from, to, groupBy).map((key) => [
    key,
    { key, revenue: 0, completedOrderCount: 0 },
  ]));
  for (const order of orders) {
    if (!order.completedAt) continue;
    const localDate = safeParseDate(formatBusinessDate(order.completedAt), 'completedAt');
    const key = bucketKey(localDate, groupBy);
    const point = aggregate.get(key);
    if (!point) continue;
    point.revenue += Math.round(Number(order.total));
    point.completedOrderCount += 1;
  }

  return {
    timezone: BUSINESS_TIME_ZONE,
    groupBy,
    from: from.text,
    to: to.text,
    points: [...aggregate.values()],
  };
}
