import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { getOtpSecrets } from '../src/config/email.js';
import prisma from '../src/config/db.js';
import { linkGoogleIdentity, loginWithGoogle } from '../src/services/google-auth.service.js';
import { cancelGuestOrder } from '../src/services/order.service.js';
import { createOpaqueToken, hashOpaqueToken, hmacSecret } from '../src/utils/secureToken.js';
import { assertIsolatedTestDatabase } from './testDatabaseGuard.js';

const PREFIX = 'b1b2.integration';
const PHONE = '0900000199';
let server;
let baseUrl;
let variant;

async function api(path, { method = 'GET', token, checkoutToken, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (checkoutToken) headers['X-Checkout-Token'] = checkoutToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

async function createGuestIntent(email, quantity = 1) {
  return api('/api/checkout/intents', {
    method: 'POST',
    body: {
      email,
      receiverName: 'B1B2 Test Receiver',
      receiverPhone: PHONE,
      receiverAddress: 'B1B2 Test Address',
      note: null,
      items: [{
        productSlug: variant.colorway.product.slug,
        colorwaySlug: variant.colorway.slug,
        size: variant.size,
        quantity,
      }],
    },
  });
}

async function insertCheckoutChallenge(intent, code = '123456') {
  const id = randomUUID();
  const { otpSecret } = getOtpSecrets();
  const codeHash = hmacSecret(
    `${id}:${intent.email}:CHECKOUT:${code}`,
    otpSecret,
    'email-otp:v1'
  );
  await prisma.emailChallenge.create({
    data: {
      id,
      purpose: 'CHECKOUT',
      checkoutIntentId: intent.id,
      email: intent.email,
      codeHash,
      expiresAt: new Date(Date.now() + 300_000),
      resendAvailableAt: new Date(Date.now() + 60_000),
    },
  });
  return { id, code, codeHash };
}

before(async () => {
  await assertIsolatedTestDatabase(prisma);
  variant = await prisma.variant.findFirst({
    where: {
      stock: { gte: 10 },
      colorway: { isActive: true, product: { isActive: true, brand: { isActive: true } } },
    },
    include: { colorway: { include: { product: true } } },
  });
  assert.ok(variant, 'B1+B2 tests require a sellable seeded variant');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await prisma.emailOutbox.deleteMany({ where: { recipient: { contains: PREFIX } } });
  await prisma.checkoutIntent.deleteMany({ where: { email: { contains: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { contains: PREFIX }, orders: { none: {} } } });
  await prisma.securityThrottle.deleteMany({ where: { scope: { startsWith: 'OTP_' } } });
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('mocked Google decisions create, return, block auto-link and require password linking', async () => {
  const googleEmail = `${PREFIX}.google@example.test`;
  const existingEmail = `${PREFIX}.existing@example.test`;
  const verifyNew = async () => ({ subject: 'google-sub-new', email: googleEmail, fullName: 'Google Test' });
  const first = await loginWithGoogle({ credential: 'mocked' }, { verify: verifyNew });
  const returning = await loginWithGoogle({ credential: 'mocked' }, { verify: verifyNew });
  assert.equal(first.isNewMember, true);
  assert.equal(returning.isNewMember, false);
  assert.equal(first.member.id, returning.member.id);
  assert.equal(first.member.hasPassword, false);
  assert.deepEqual(first.member.authMethods, ['GOOGLE']);

  const password = 'mock-link-password';
  const existing = await prisma.user.create({
    data: { email: existingEmail, fullName: 'Existing Member', phone: PHONE, passwordHash: await bcrypt.hash(password, 4) },
  });
  const verifyExisting = async () => ({ subject: 'google-sub-existing', email: existingEmail, fullName: 'Existing Member' });
  await assert.rejects(
    loginWithGoogle({ credential: 'mocked' }, { verify: verifyExisting }),
    (error) => error.code === 'ACCOUNT_LINK_REQUIRED'
  );
  await assert.rejects(
    linkGoogleIdentity(existing.id, { credential: 'mocked', currentPassword: 'wrong' }, { verify: verifyExisting }),
    (error) => error.code === 'INVALID_CREDENTIALS'
  );
  const linked = await linkGoogleIdentity(existing.id, { credential: 'mocked', currentPassword: password }, { verify: verifyExisting });
  assert.deepEqual(linked.authMethods.sort(), ['GOOGLE', 'PASSWORD']);
});

test('OTP is intent-bound, single-use and locked after five incorrect attempts', async () => {
  const email = `${PREFIX}.otp@example.test`;
  const firstResponse = await createGuestIntent(email);
  const secondResponse = await createGuestIntent(email);
  assert.equal(firstResponse.status, 201);
  assert.equal(secondResponse.status, 201);
  const first = firstResponse.body.data.intent;
  const second = secondResponse.body.data.intent;
  const firstChallenge = await insertCheckoutChallenge(first);
  assert.notEqual(firstChallenge.codeHash, firstChallenge.code);

  const crossIntent = await api(`/api/checkout/intents/${second.id}/email-otp/verify`, {
    method: 'POST', checkoutToken: secondResponse.body.data.guestToken,
    body: { challengeId: firstChallenge.id, otp: firstChallenge.code },
  });
  assert.equal(crossIntent.status, 409);
  assert.equal(crossIntent.body.error.code, 'CHALLENGE_CONTEXT_MISMATCH');

  const verified = await api(`/api/checkout/intents/${first.id}/email-otp/verify`, {
    method: 'POST', checkoutToken: firstResponse.body.data.guestToken,
    body: { challengeId: firstChallenge.id, otp: firstChallenge.code },
  });
  assert.equal(verified.status, 200);
  const reused = await api(`/api/checkout/intents/${first.id}/email-otp/verify`, {
    method: 'POST', checkoutToken: firstResponse.body.data.guestToken,
    body: { challengeId: firstChallenge.id, otp: firstChallenge.code },
  });
  assert.equal(reused.status, 409);
  assert.equal(reused.body.error.code, 'OTP_ALREADY_USED');

  const lockChallenge = await insertCheckoutChallenge(second, '654321');
  for (let attempt = 1; attempt <= 5; attempt++) {
    const rejected = await api(`/api/checkout/intents/${second.id}/email-otp/verify`, {
      method: 'POST', checkoutToken: secondResponse.body.data.guestToken,
      body: { challengeId: lockChallenge.id, otp: '000000' },
    });
    assert.equal(rejected.status, attempt === 5 ? 423 : 400);
  }
});

test('email-wide OTP rate limit survives creation of new Checkout Intents', async () => {
  const email = `${PREFIX}.rate@example.test`;
  const responses = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const intent = await createGuestIntent(email);
    assert.equal(intent.status, 201);
    responses.push(await api(`/api/checkout/intents/${intent.body.data.intent.id}/email-otp/send`, {
      method: 'POST', checkoutToken: intent.body.data.guestToken, body: {},
    }));
  }
  assert.deepEqual(responses.slice(0, 3).map((response) => response.status), [503, 503, 503]);
  assert.equal(responses[3].status, 429);
  assert.equal(responses[3].body.error.code, 'OTP_RATE_LIMITED');
});

test('password reset accepts a valid token once and rejects wrong or expired tokens', async () => {
  const email = `${PREFIX}.reset@example.test`;
  const originalPassword = 'reset-original-password-2026';
  const newPassword = 'reset-updated-password-2026';
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Password Reset Test',
      phone: PHONE,
      passwordHash: await bcrypt.hash(originalPassword, 4),
    },
  });
  const validToken = createOpaqueToken();
  const expiredToken = createOpaqueToken();
  await prisma.passwordResetToken.createMany({
    data: [
      {
        userId: user.id,
        tokenHash: hashOpaqueToken(validToken),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
      {
        userId: user.id,
        tokenHash: hashOpaqueToken(expiredToken),
        expiresAt: new Date(Date.now() - 1_000),
      },
    ],
  });

  const wrong = await api('/api/auth/password/reset', {
    method: 'POST',
    body: { token: createOpaqueToken(), newPassword, newPasswordConfirmation: newPassword },
  });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error.code, 'RESET_TOKEN_INVALID');

  const expired = await api('/api/auth/password/reset', {
    method: 'POST',
    body: { token: expiredToken, newPassword, newPasswordConfirmation: newPassword },
  });
  assert.equal(expired.status, 410);
  assert.equal(expired.body.error.code, 'RESET_TOKEN_EXPIRED');

  const reset = await api('/api/auth/password/reset', {
    method: 'POST',
    body: { token: validToken, newPassword, newPasswordConfirmation: newPassword },
  });
  assert.equal(reset.status, 200);
  assert.equal(await bcrypt.compare(newPassword, (await prisma.user.findUnique({ where: { id: user.id } })).passwordHash), true);

  const reused = await api('/api/auth/password/reset', {
    method: 'POST',
    body: { token: validToken, newPassword, newPasswordConfirmation: newPassword },
  });
  assert.equal(reused.status, 400);
  assert.equal(reused.body.error.code, 'RESET_TOKEN_INVALID');
});

test('COD replay after a lost response creates one stock change and one outbox event', async () => {
  const email = `${PREFIX}.cod@example.test`;
  const response = await createGuestIntent(email);
  const intent = response.body.data.intent;
  const checkoutToken = response.body.data.guestToken;
  const challenge = await insertCheckoutChallenge(intent);
  assert.equal((await api(`/api/checkout/intents/${intent.id}/email-otp/verify`, {
    method: 'POST', checkoutToken, body: { challengeId: challenge.id, otp: challenge.code },
  })).status, 200);
  const stockBefore = (await prisma.variant.findUnique({ where: { id: variant.id } })).stock;
  const first = await api(`/api/checkout/intents/${intent.id}/confirm-cod`, {
    method: 'POST', checkoutToken, body: { acceptedQuoteVersion: intent.quoteVersion },
  });
  const replay = await api(`/api/checkout/intents/${intent.id}/confirm-cod`, {
    method: 'POST', checkoutToken, body: { acceptedQuoteVersion: intent.quoteVersion },
  });
  assert.equal(first.status, 201);
  assert.equal(replay.status, 200);
  assert.equal(first.body.data.orderCode, replay.body.data.orderCode);
  assert.equal(replay.body.data.idempotentReplay, true);
  assert.equal(await prisma.order.count({ where: { checkoutIntentId: intent.id } }), 1);
  const order = await prisma.order.findUnique({ where: { checkoutIntentId: intent.id } });
  assert.equal(await prisma.emailOutbox.count({ where: { eventKey: `order.created:${order.id}` } }), 1);
  assert.equal((await prisma.variant.findUnique({ where: { id: variant.id } })).stock, stockBefore - 1);

  await cancelGuestOrder({ orderCode: order.orderCode, receiverPhone: PHONE });
  await prisma.emailOutbox.deleteMany({ where: { eventKey: `order.created:${order.id}` } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.checkoutIntent.delete({ where: { id: intent.id } });
  assert.equal((await prisma.variant.findUnique({ where: { id: variant.id } })).stock, stockBefore);
});

test('two concurrent COD confirmations create one order, stock change and outbox event', async () => {
  const email = `${PREFIX}.cod.concurrent@example.test`;
  const response = await createGuestIntent(email);
  const intent = response.body.data.intent;
  const checkoutToken = response.body.data.guestToken;
  const challenge = await insertCheckoutChallenge(intent);
  assert.equal((await api(`/api/checkout/intents/${intent.id}/email-otp/verify`, {
    method: 'POST', checkoutToken, body: { challengeId: challenge.id, otp: challenge.code },
  })).status, 200);
  const stockBefore = (await prisma.variant.findUnique({ where: { id: variant.id } })).stock;

  try {
    const confirmations = await Promise.all([
      api(`/api/checkout/intents/${intent.id}/confirm-cod`, {
        method: 'POST', checkoutToken, body: { acceptedQuoteVersion: intent.quoteVersion },
      }),
      api(`/api/checkout/intents/${intent.id}/confirm-cod`, {
        method: 'POST', checkoutToken, body: { acceptedQuoteVersion: intent.quoteVersion },
      }),
    ]);
    assert.deepEqual(confirmations.map((item) => item.status).sort(), [200, 201]);
    assert.equal(confirmations[0].body.data.orderCode, confirmations[1].body.data.orderCode);
    assert.equal(await prisma.order.count({ where: { checkoutIntentId: intent.id } }), 1);
    const order = await prisma.order.findUnique({ where: { checkoutIntentId: intent.id } });
    assert.equal(await prisma.emailOutbox.count({ where: { eventKey: `order.created:${order.id}` } }), 1);
    assert.equal((await prisma.variant.findUnique({ where: { id: variant.id } })).stock, stockBefore - 1);
  } finally {
    const order = await prisma.order.findUnique({ where: { checkoutIntentId: intent.id } });
    if (order) {
      if (order.status === 'PENDING') {
        await cancelGuestOrder({ orderCode: order.orderCode, receiverPhone: PHONE });
      }
      await prisma.emailOutbox.deleteMany({ where: { eventKey: `order.created:${order.id}` } });
      await prisma.order.delete({ where: { id: order.id } });
    }
    await prisma.checkoutIntent.deleteMany({ where: { id: intent.id } });
  }
  assert.equal((await prisma.variant.findUnique({ where: { id: variant.id } })).stock, stockBefore);
});

test('changed price persists a new quote/version without clearing verified email', async () => {
  const email = `${PREFIX}.quote@example.test`;
  const response = await createGuestIntent(email);
  const intent = response.body.data.intent;
  await prisma.checkoutIntent.update({
    where: { id: intent.id },
    data: { status: 'EMAIL_VERIFIED', verifiedAt: new Date() },
  });
  const originalColorway = await prisma.colorway.findUnique({ where: { id: variant.colorwayId } });
  const originalPrice = originalColorway.price;
  try {
    await prisma.colorway.update({
      where: { id: originalColorway.id },
      data: { price: Number(originalPrice) + 1000, salePrice: null },
    });
    const changed = await api(`/api/checkout/intents/${intent.id}/confirm-cod`, {
      method: 'POST', checkoutToken: response.body.data.guestToken,
      body: { acceptedQuoteVersion: intent.quoteVersion },
    });
    assert.equal(changed.status, 409);
    assert.equal(changed.body.error.code, 'CHECKOUT_CHANGED');
    const persisted = await prisma.checkoutIntent.findUnique({ where: { id: intent.id } });
    assert.equal(persisted.quoteVersion, intent.quoteVersion + 1);
    assert.ok(persisted.verifiedAt);
    assert.equal(persisted.status, 'EMAIL_VERIFIED');
  } finally {
    await prisma.colorway.update({
      where: { id: originalColorway.id },
      data: { price: originalPrice, salePrice: originalColorway.salePrice },
    });
  }
});

test('legacy raw POST /api/orders cannot bypass Checkout Intent and OTP', async () => {
  const bypass = await api('/api/orders', {
    method: 'POST',
    body: {
      receiverName: 'Bypass', receiverPhone: PHONE, receiverAddress: 'Address',
      items: [], expectedShippingFee: 0,
    },
  });
  assert.equal(bypass.status, 409);
  assert.equal(bypass.body.error.code, 'CHECKOUT_INTENT_REQUIRED');
});
