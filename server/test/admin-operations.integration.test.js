import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';
import { runAutoCompletionSweep } from '../src/services/order-auto-completion.service.js';
import { assertIsolatedTestDatabase } from './testDatabaseGuard.js';

process.env.JWT_ADMIN_SECRET ||= 'admin-operations-integration-secret-32-chars';
process.env.JWT_ADMIN_EXPIRES_IN = '8h';

const runId = `${Date.now()}-${process.pid}`;
const adminEmail = `admin-operations-${runId}@example.test`;
const memberEmail = `admin-operations-member-${runId}@example.test`;
const password = 'AdminOperationsTest123';
const orderCodes = [
  `ADMIN-OPS-${runId}-FLOW`,
  `ADMIN-OPS-${runId}-CANCEL`,
  `ADMIN-OPS-${runId}-AUTO`,
];
let server;
let baseUrl;
let token;
let adminId;
let memberId;
let productId;
let variant;
let originalStock;
let reviewId;
let isolationGuardPassed = false;

async function api(path, { method = 'GET', body, auth = token } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function createOrder(orderCode) {
  const now = new Date();
  return prisma.order.create({
    data: {
      orderCode,
      userId: memberId,
      status: 'PENDING',
      paymentMethod: 'COD',
      receiverName: 'Admin Operations Test',
      receiverPhone: '0900000999',
      receiverAddress: 'Isolated integration database',
      subtotal: 100000,
      shippingFee: 0,
      total: 100000,
      orderItems: {
        create: {
          variantId: variant.id,
          productName: variant.colorway.product.name,
          colorwayName: variant.colorway.name,
          size: variant.size,
          unitPrice: 100000,
          quantity: 1,
        },
      },
      statusHistories: { create: { status: 'PENDING', changedAt: now } },
    },
  });
}

before(async () => {
  await assertIsolatedTestDatabase(prisma);
  isolationGuardPassed = true;
  variant = await prisma.variant.findFirst({
    where: { stock: { gte: 3 } },
    orderBy: { id: 'asc' },
    include: { colorway: { include: { product: true } } },
  });
  assert.ok(variant, 'Admin operations tests require one catalog Variant with stock >= 3');
  originalStock = variant.stock;
  productId = variant.colorway.product.id;

  const [admin, member] = await prisma.$transaction([
    prisma.adminAccount.create({
      data: {
        email: adminEmail,
        fullName: 'Admin Operations Integration',
        passwordHash: await hashPassword(password),
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: await hashPassword(password),
        fullName: 'Admin Operations Member',
        phone: '0900000999',
      },
    }),
  ]);
  adminId = admin.id;
  memberId = member.id;
  await createOrder(orderCodes[0]);
  await createOrder(orderCodes[1]);
  const autoOrder = await createOrder(orderCodes[2]);
  const oldDeliveredAt = new Date(Date.now() - 49 * 60 * 60 * 1000);
  await prisma.order.update({
    where: { id: autoOrder.id },
    data: {
      status: 'DELIVERED',
      deliveredAt: oldDeliveredAt,
      statusHistories: { create: { status: 'DELIVERED', changedAt: oldDeliveredAt } },
    },
  });
  await prisma.variant.update({ where: { id: variant.id }, data: { stock: { decrement: 3 } } });
  const review = await prisma.review.create({
    data: { productId, userId: memberId, rating: 4, comment: `Admin operations ${runId}` },
  });
  reviewId = review.id;

  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/api/admin/auth/login', {
    method: 'POST',
    auth: null,
    body: { email: adminEmail, password },
  });
  assert.equal(login.status, 200);
  token = login.body.data.token;
});

after(async () => {
  if (!isolationGuardPassed) {
    await prisma.$disconnect();
    return;
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.order.deleteMany({ where: { orderCode: { in: orderCodes } } });
  await prisma.review.deleteMany({ where: { userId: memberId } });
  if (variant) await prisma.variant.update({ where: { id: variant.id }, data: { stock: originalStock } });
  if (memberId) await prisma.user.deleteMany({ where: { id: memberId, orders: { none: {} } } });
  if (adminId) await prisma.adminAccount.deleteMany({ where: { id: adminId } });
  await prisma.$disconnect();
});

test('Admin operations endpoints require Admin authentication', async () => {
  const response = await api('/api/admin/orders', { auth: null });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('Admin can list, inspect and advance an Order through valid states only', async () => {
  const list = await api(`/api/admin/orders?q=${encodeURIComponent(orderCodes[0])}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.items.length, 1);
  assert.equal(list.body.data.items[0].customerType, 'MEMBER');

  for (const status of ['PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED']) {
    const updated = await api(`/api/admin/orders/${orderCodes[0]}/status`, {
      method: 'PATCH',
      body: { status },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.order.status, status);
  }

  const invalid = await api(`/api/admin/orders/${orderCodes[0]}/status`, {
    method: 'PATCH',
    body: { status: 'CANCELLED' },
  });
  assert.equal(invalid.status, 409);
  assert.equal(invalid.body.error.code, 'ORDER_STATUS_NOT_ALLOWED');
});

test('Admin cancellation restores reserved stock exactly once', async () => {
  const first = await api(`/api/admin/orders/${orderCodes[1]}/status`, {
    method: 'PATCH',
    body: { status: 'CANCELLED' },
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.order.status, 'CANCELLED');

  const second = await api(`/api/admin/orders/${orderCodes[1]}/status`, {
    method: 'PATCH',
    body: { status: 'CANCELLED' },
  });
  assert.equal(second.status, 409);
  const currentVariant = await prisma.variant.findUnique({ where: { id: variant.id } });
  assert.equal(currentVariant.stock, originalStock - 2);
});

test('48-hour sweep completes eligible Delivered Orders idempotently', async () => {
  const first = await runAutoCompletionSweep({ now: new Date() });
  assert.ok(first.completed >= 1);
  const completed = await prisma.order.findUnique({ where: { orderCode: orderCodes[2] } });
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt instanceof Date);

  await runAutoCompletionSweep({ now: new Date() });
  const unchanged = await prisma.order.findUnique({ where: { orderCode: orderCodes[2] } });
  assert.equal(unchanged.completedAt.toISOString(), completed.completedAt.toISOString());
});

test('Customer endpoints expose read-only profile summaries and owned Orders', async () => {
  const detail = await api(`/api/admin/customers/${memberId}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.customer.email, memberEmail);
  assert.equal(detail.body.data.summary.totalOrders, 3);

  const orders = await api(`/api/admin/customers/${memberId}/orders?status=COMPLETED`);
  assert.equal(orders.status, 200);
  assert.equal(orders.body.data.items.length, 2);
});

test('Admin can list, inspect and delete Reviews without an edit route', async () => {
  const list = await api(`/api/admin/reviews?customerId=${memberId}&rating=4`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.items[0].reviewId, reviewId);

  const detail = await api(`/api/admin/reviews/${reviewId}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.review.comment, `Admin operations ${runId}`);

  const unsupportedEdit = await api(`/api/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    body: { rating: 5 },
  });
  assert.equal(unsupportedEdit.status, 404);

  const removed = await api(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.deleted, true);
  reviewId = null;
});

test('Dashboard applies completed-revenue, status, best-seller and low-stock contracts', async () => {
  const summary = await api('/api/admin/dashboard/summary?topLimit=5&lowStockLimit=20');
  assert.equal(summary.status, 200);
  assert.equal(summary.body.data.timezone, 'Asia/Ho_Chi_Minh');
  assert.ok(summary.body.data.orderStatusCounts.COMPLETED >= 1);
  assert.ok(Array.isArray(summary.body.data.bestSellingProducts));
  assert.ok(summary.body.data.lowStockVariants.every((item) => item.stock <= 3));

  const revenue = await api('/api/admin/dashboard/revenue?groupBy=day');
  assert.equal(revenue.status, 200);
  assert.equal(revenue.body.data.groupBy, 'day');
  assert.equal(revenue.body.data.points.length, 30);
});
