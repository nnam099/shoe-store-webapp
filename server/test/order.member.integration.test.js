import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { getMemberAuthConfig } from '../src/config/memberAuth.js';
import { derivePasswordVersion, issueMemberToken } from '../src/utils/memberToken.js';

const TEST_EMAILS = [
  'm8c.integration.a@example.test',
  'm8c.integration.b@example.test',
];
const TEST_PHONE = '0900000812';
const TEST_PASSWORD = 'member-pass-8c';

let server;
let baseUrl;
let baselineCounts;
let variant;
let variantStockBefore;
const createdOrderCodes = new Set();

async function counts() {
  const [users, orders, orderItems, orderStatusHistories] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderStatusHistory.count(),
  ]);
  return { users, orders, orderItems, orderStatusHistories };
}

async function api(path, { method = 'GET', authorization, body } = {}) {
  const headers = {};
  if (authorization !== undefined) headers.Authorization = authorization;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  return { status: response.status, body: payload };
}

function bearer(token) {
  return `Bearer ${token}`;
}

function customToken(user, expiresIn) {
  const config = getMemberAuthConfig();
  return jwt.sign(
    { type: 'member', pv: derivePasswordVersion(user.passwordHash) },
    config.secret,
    {
      algorithm: 'HS256',
      subject: String(user.id),
      issuer: config.issuer,
      audience: config.audience,
      expiresIn,
    }
  );
}

function assertNoPrivateOrderFields(value) {
  const forbidden = new Set([
    'id',
    'userId',
    'receiverName',
    'receiverPhone',
    'receiverAddress',
    'note',
    'variantId',
    'orderId',
  ]);

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      assert.equal(forbidden.has(key), false, `private field leaked: ${key}`);
      visit(child);
    }
  }
  visit(value);
}

before(async () => {
  baselineCounts = await counts();

  const candidates = await prisma.variant.findMany({
    where: { stock: { gte: 15 } },
    orderBy: [{ stock: 'desc' }, { id: 'asc' }],
    include: {
      colorway: {
        include: { product: { include: { brand: true } } },
      },
    },
  });
  variant = candidates.find((candidate) => (
    candidate.colorway.isActive
    && candidate.colorway.product.isActive
    && candidate.colorway.product.brand.isActive
  ));
  assert.ok(variant, 'a sellable variant with test capacity is required');
  variantStockBefore = variant.stock;

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const orderCode of createdOrderCodes) {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: { orderItems: true },
    });
    if (!order) continue;

    if (order.stockRestoredAt === null) {
      for (const item of order.orderItems) {
        await prisma.variant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    await prisma.order.delete({ where: { orderCode } });
  }

  await prisma.user.deleteMany({
    where: {
      email: { in: TEST_EMAILS },
      orders: { none: {} },
    },
  });

  const variantAfter = await prisma.variant.findUnique({ where: { id: variant.id } });
  assert.equal(variantAfter.stock, variantStockBefore);
  assert.deepEqual(await counts(), baselineCounts);
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('Phase 8C Member checkout and order API', async (t) => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  const [memberA, memberB] = await Promise.all(TEST_EMAILS.map((email, index) => (
    prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: `M8C Member ${index + 1}`,
        phone: TEST_PHONE,
      },
    })
  )));
  let tokenA = issueMemberToken(memberA);
  const tokenB = issueMemberToken(memberB);

  const item = {
    productSlug: variant.colorway.product.slug,
    colorwaySlug: variant.colorway.slug,
    size: variant.size,
    quantity: 1,
  };
  const quoteResponse = await api('/api/checkout/quote', {
    method: 'POST',
    body: { items: [item] },
  });
  assert.equal(quoteResponse.status, 200);
  const quote = quoteResponse.body.data;

  async function createOrder(authorization, overrides = {}) {
    const response = await api('/api/orders', {
      method: 'POST',
      authorization,
      body: {
        receiverName: 'M8C Integration Recipient',
        receiverPhone: TEST_PHONE,
        receiverAddress: 'M8C Integration Address',
        note: null,
        items: [{ ...item, expectedUnitPrice: quote.items[0].unitPrice }],
        expectedShippingFee: quote.shippingFee,
        ...overrides,
      },
    });
    if (response.status === 201) createdOrderCodes.add(response.body.data.orderCode);
    return response;
  }

  async function setStatus(orderCode, status) {
    const order = await prisma.order.findUnique({ where: { orderCode } });
    const changedAt = new Date();
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status,
          ...(status === 'DELIVERED' ? { deliveredAt: changedAt } : {}),
        },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId: order.id, status, changedAt },
      }),
    ]);
  }

  let guestOrder;
  let memberAOrder;
  let memberASecondOrder;
  let memberBOrder;

  await t.test('strict optional auth establishes Guest/Member ownership and rejects body userId', async () => {
    guestOrder = await createOrder();
    assert.equal(guestOrder.status, 201);
    const guestRow = await prisma.order.findUnique({
      where: { orderCode: guestOrder.body.data.orderCode },
    });
    assert.equal(guestRow.userId, null);

    memberAOrder = await createOrder(bearer(tokenA));
    assert.equal(memberAOrder.status, 201);
    const memberRow = await prisma.order.findUnique({
      where: { orderCode: memberAOrder.body.data.orderCode },
    });
    assert.equal(memberRow.userId, memberA.id);

    const beforeRejected = {
      orderCount: await prisma.order.count(),
      stock: (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
    };
    const fakeOwnership = await createOrder(undefined, { userId: memberB.id });
    assert.equal(fakeOwnership.status, 400);
    assert.equal(fakeOwnership.body.error.code, 'VALIDATION_ERROR');
    assert.equal(await prisma.order.count(), beforeRejected.orderCount);
    assert.equal(
      (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
      beforeRejected.stock
    );
  });

  await t.test('invalid, expired, and stale tokens never downgrade checkout to Guest', async () => {
    const before = {
      orders: await prisma.order.count(),
      stock: (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
    };

    for (const authorization of [
      'Bearer invalid-token',
      bearer(customToken(memberA, -1)),
    ]) {
      const rejected = await createOrder(authorization);
      assert.equal(rejected.status, 401);
      assert.equal(rejected.body.error.code, 'UNAUTHORIZED');
    }

    const staleToken = tokenA;
    const newHash = await bcrypt.hash(`${TEST_PASSWORD}-changed`, 4);
    const updatedA = await prisma.user.update({
      where: { id: memberA.id },
      data: { passwordHash: newHash },
    });
    const stale = await createOrder(bearer(staleToken));
    assert.equal(stale.status, 401);
    assert.equal(stale.body.error.code, 'UNAUTHORIZED');
    tokenA = issueMemberToken(updatedA);

    assert.equal(await prisma.order.count(), before.orders);
    assert.equal(
      (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
      before.stock
    );
  });

  await t.test('Member list and detail enforce ownership, pagination, order, and privacy', async () => {
    memberBOrder = await createOrder(bearer(tokenB));
    memberASecondOrder = await createOrder(bearer(tokenA));
    assert.equal(memberBOrder.status, 201);
    assert.equal(memberASecondOrder.status, 201);

    const listA = await api('/api/member/orders?page=1&limit=10', {
      authorization: bearer(tokenA),
    });
    assert.equal(listA.status, 200);
    const codesA = listA.body.data.orders.map((order) => order.orderCode);
    assert.deepEqual(
      codesA,
      [memberASecondOrder.body.data.orderCode, memberAOrder.body.data.orderCode]
    );
    assert.equal(codesA.includes(memberBOrder.body.data.orderCode), false);
    assert.equal(codesA.includes(guestOrder.body.data.orderCode), false);
    assert.equal(listA.body.data.pagination.totalItems, 2);
    assertNoPrivateOrderFields(listA.body.data);

    const listB = await api('/api/member/orders', {
      authorization: bearer(tokenB),
    });
    assert.equal(listB.status, 200);
    assert.deepEqual(
      listB.body.data.orders.map((order) => order.orderCode),
      [memberBOrder.body.data.orderCode]
    );

    const pageTwo = await api('/api/member/orders?page=2&limit=1', {
      authorization: bearer(tokenA),
    });
    assert.equal(pageTwo.status, 200);
    assert.equal(pageTwo.body.data.orders[0].orderCode, memberAOrder.body.data.orderCode);
    assert.deepEqual(pageTwo.body.data.pagination, {
      page: 2,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });

    for (const query of ['page=0', 'page=x', 'limit=0', 'limit=51']) {
      const invalid = await api(`/api/member/orders?${query}`, {
        authorization: bearer(tokenA),
      });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }

    const own = await api(`/api/member/orders/${memberAOrder.body.data.orderCode}`, {
      authorization: bearer(tokenA),
    });
    assert.equal(own.status, 200);
    assert.equal(own.body.data.timeline[0].status, 'PENDING');
    assertNoPrivateOrderFields(own.body.data);

    for (const code of [
      memberBOrder.body.data.orderCode,
      guestOrder.body.data.orderCode,
      'M8C-NOT-FOUND',
    ]) {
      const hidden = await api(`/api/member/orders/${code}`, {
        authorization: bearer(tokenA),
      });
      assert.equal(hidden.status, 404);
      assert.equal(hidden.body.error.code, 'ORDER_NOT_FOUND');
      assert.equal(hidden.body.error.message, own.body.success ? 'Không tìm thấy đơn hàng với thông tin đã cung cấp.' : '');
    }
  });

  await t.test('Guest and Member cancellation share one race-safe stock restoration', async () => {
    const stockBeforeGuestCancel = (
      await prisma.variant.findUnique({ where: { id: variant.id } })
    ).stock;
    const wrongPhone = await api(`/api/orders/${guestOrder.body.data.orderCode}/cancel`, {
      method: 'POST',
      body: { receiverPhone: '0909999999' },
    });
    const wrongCode = await api('/api/orders/M8C-NOT-FOUND/cancel', {
      method: 'POST',
      body: { receiverPhone: TEST_PHONE },
    });
    assert.equal(wrongPhone.status, 404);
    assert.equal(wrongCode.status, 404);
    assert.deepEqual(wrongPhone.body.error, wrongCode.body.error);

    const guestCancel = await api(`/api/orders/${guestOrder.body.data.orderCode}/cancel`, {
      method: 'POST',
      body: { receiverPhone: '0900 000 812' },
    });
    assert.equal(guestCancel.status, 200);
    assert.equal(
      (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
      stockBeforeGuestCancel + 1
    );

    await setStatus(memberASecondOrder.body.data.orderCode, 'PREPARING');
    const preparingCancel = await api(
      `/api/member/orders/${memberASecondOrder.body.data.orderCode}/cancel`,
      { method: 'POST', authorization: bearer(tokenA) }
    );
    assert.equal(preparingCancel.status, 200);

    await setStatus(memberBOrder.body.data.orderCode, 'SHIPPING');
    const shippingCancel = await api(
      `/api/member/orders/${memberBOrder.body.data.orderCode}/cancel`,
      { method: 'POST', authorization: bearer(tokenB) }
    );
    assert.equal(shippingCancel.status, 409);
    assert.equal(shippingCancel.body.error.code, 'ORDER_NOT_CANCELLABLE');

    for (const code of [guestOrder.body.data.orderCode, memberBOrder.body.data.orderCode]) {
      const hidden = await api(`/api/member/orders/${code}/cancel`, {
        method: 'POST',
        authorization: bearer(tokenA),
      });
      assert.equal(hidden.status, 404);
      assert.equal(hidden.body.error.code, 'ORDER_NOT_FOUND');
    }

    const concurrentOrder = await createOrder(bearer(tokenA));
    const stockBeforeRace = (
      await prisma.variant.findUnique({ where: { id: variant.id } })
    ).stock;
    const cancellationPath = `/api/member/orders/${concurrentOrder.body.data.orderCode}/cancel`;
    const race = await Promise.all([
      api(cancellationPath, { method: 'POST', authorization: bearer(tokenA) }),
      api(cancellationPath, { method: 'POST', authorization: bearer(tokenA) }),
    ]);
    assert.deepEqual(race.map((result) => result.status).sort(), [200, 409]);
    assert.equal(
      (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
      stockBeforeRace + 1
    );
    const concurrentRow = await prisma.order.findUnique({
      where: { orderCode: concurrentOrder.body.data.orderCode },
    });
    assert.ok(concurrentRow.cancelledAt);
    assert.ok(concurrentRow.stockRestoredAt);
    assert.equal(await prisma.orderStatusHistory.count({
      where: { orderId: concurrentRow.id, status: 'CANCELLED' },
    }), 1);
  });

  await t.test('Guest and Member confirmation share DELIVERED to COMPLETED transition', async () => {
    const guestNonDelivered = await api(
      `/api/orders/${guestOrder.body.data.orderCode}/confirm-received`,
      { method: 'POST', body: { receiverPhone: TEST_PHONE } }
    );
    assert.equal(guestNonDelivered.status, 409);
    assert.equal(guestNonDelivered.body.error.code, 'ORDER_NOT_CONFIRMABLE');

    const guestDelivered = await createOrder();
    await setStatus(guestDelivered.body.data.orderCode, 'DELIVERED');
    const guestDeliveredRow = await prisma.order.findUnique({
      where: { orderCode: guestDelivered.body.data.orderCode },
    });
    const stockBeforeCompletion = (
      await prisma.variant.findUnique({ where: { id: variant.id } })
    ).stock;

    const wrongPhone = await api(
      `/api/orders/${guestDelivered.body.data.orderCode}/confirm-received`,
      { method: 'POST', body: { receiverPhone: '0909999999' } }
    );
    const wrongCode = await api('/api/orders/M8C-NOT-FOUND/confirm-received', {
      method: 'POST',
      body: { receiverPhone: TEST_PHONE },
    });
    assert.equal(wrongPhone.status, 404);
    assert.deepEqual(wrongPhone.body.error, wrongCode.body.error);

    const confirmationPath = `/api/orders/${guestDelivered.body.data.orderCode}/confirm-received`;
    const race = await Promise.all([
      api(confirmationPath, { method: 'POST', body: { receiverPhone: TEST_PHONE } }),
      api(confirmationPath, { method: 'POST', body: { receiverPhone: TEST_PHONE } }),
    ]);
    assert.deepEqual(race.map((result) => result.status).sort(), [200, 409]);
    const successfulGuestConfirmation = race.find((result) => result.status === 200);
    assert.deepEqual(
      successfulGuestConfirmation.body.data.timeline.map((entry) => entry.status),
      ['PENDING', 'DELIVERED', 'COMPLETED']
    );
    assert.equal(
      (await prisma.variant.findUnique({ where: { id: variant.id } })).stock,
      stockBeforeCompletion
    );
    const completedGuest = await prisma.order.findUnique({
      where: { id: guestDeliveredRow.id },
    });
    assert.equal(completedGuest.status, 'COMPLETED');
    assert.ok(completedGuest.completedAt);
    assert.equal(await prisma.orderStatusHistory.count({
      where: { orderId: completedGuest.id, status: 'COMPLETED' },
    }), 1);

    const memberDelivered = await createOrder(bearer(tokenA));
    await setStatus(memberDelivered.body.data.orderCode, 'DELIVERED');
    const otherMember = await api(
      `/api/member/orders/${memberDelivered.body.data.orderCode}/confirm-received`,
      { method: 'POST', authorization: bearer(tokenB) }
    );
    assert.equal(otherMember.status, 404);

    const guestThroughMember = await api(
      `/api/member/orders/${guestDelivered.body.data.orderCode}/confirm-received`,
      { method: 'POST', authorization: bearer(tokenA) }
    );
    assert.equal(guestThroughMember.status, 404);

    const memberConfirm = await api(
      `/api/member/orders/${memberDelivered.body.data.orderCode}/confirm-received`,
      { method: 'POST', authorization: bearer(tokenA) }
    );
    assert.equal(memberConfirm.status, 200);
    assert.equal(memberConfirm.body.data.status, 'COMPLETED');
    assert.ok(memberConfirm.body.data.completedAt);
    assert.equal(memberConfirm.body.data.confirmable, false);
    assert.deepEqual(
      memberConfirm.body.data.timeline.map((entry) => entry.status),
      ['PENDING', 'DELIVERED', 'COMPLETED']
    );

    const repeated = await api(
      `/api/member/orders/${memberDelivered.body.data.orderCode}/confirm-received`,
      { method: 'POST', authorization: bearer(tokenA) }
    );
    assert.equal(repeated.status, 409);
    assert.equal(repeated.body.error.code, 'ORDER_NOT_CONFIRMABLE');

    const nonDelivered = await api(
      `/api/member/orders/${memberAOrder.body.data.orderCode}/confirm-received`,
      { method: 'POST', authorization: bearer(tokenA) }
    );
    assert.equal(nonDelivered.status, 409);
    assert.equal(nonDelivered.body.error.code, 'ORDER_NOT_CONFIRMABLE');
  });

  await t.test('public lookup and Member detail expose safe chronological timelines', async () => {
    const publicLookup = await api('/api/orders/lookup', {
      method: 'POST',
      body: {
        orderCode: guestOrder.body.data.orderCode,
        receiverPhone: TEST_PHONE,
      },
    });
    assert.equal(publicLookup.status, 200);
    assert.equal(publicLookup.body.data.confirmable, false);
    assert.deepEqual(
      publicLookup.body.data.timeline.map((entry) => entry.status),
      ['PENDING', 'CANCELLED']
    );
    assertNoPrivateOrderFields(publicLookup.body.data);

    const memberDetail = await api(
      `/api/member/orders/${memberASecondOrder.body.data.orderCode}`,
      { authorization: bearer(tokenA) }
    );
    assert.equal(memberDetail.status, 200);
    assert.deepEqual(
      memberDetail.body.data.timeline.map((entry) => entry.status),
      ['PENDING', 'PREPARING', 'CANCELLED']
    );
    for (let index = 1; index < memberDetail.body.data.timeline.length; index += 1) {
      assert.ok(
        Date.parse(memberDetail.body.data.timeline[index - 1].changedAt)
        <= Date.parse(memberDetail.body.data.timeline[index].changedAt)
      );
    }
    assertNoPrivateOrderFields(memberDetail.body.data);
  });
});
