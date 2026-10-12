import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { getMemberAuthConfig } from '../src/config/memberAuth.js';
import {
  requireMember,
  strictOptionalMember,
} from '../src/middlewares/memberAuth.js';
import { cancelGuestOrder } from '../src/services/order.service.js';
import { derivePasswordVersion } from '../src/utils/memberToken.js';

const TEST_EMAIL = 'm8a.integration.member@example.test';
const UNKNOWN_EMAIL = 'm8a.integration.unknown@example.test';
const TEST_PHONE = '0900000088';
const ORIGINAL_PASSWORD = 'member-pass-8a-original';
const CHANGED_PASSWORD = 'member-pass-8a-changed';
const RESET_PASSWORD = 'member-pass-8a-reset';

let server;
let baseUrl;
let baselineCounts;
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

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token !== undefined) headers.Authorization = token;

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

function createCustomToken(user, overrides = {}, options = {}) {
  const config = getMemberAuthConfig();
  return jwt.sign(
    {
      type: 'member',
      pv: derivePasswordVersion(user.passwordHash),
      ...overrides,
    },
    config.secret,
    {
      algorithm: 'HS256',
      subject: String(user.id),
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: options.expiresIn ?? '8h',
    }
  );
}

function runMiddleware(middleware, authorization) {
  const req = { headers: {} };
  if (authorization !== undefined) req.headers.authorization = authorization;

  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve({ error, member: req.member }));
  });
}

before(async () => {
  baselineCounts = await counts();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  for (const orderCode of createdOrderCodes) {
    const order = await prisma.order.findUnique({ where: { orderCode } });
    if (!order) continue;

    if (
      (order.status === 'PENDING' || order.status === 'PREPARING')
      && order.stockRestoredAt === null
    ) {
      await cancelGuestOrder({ orderCode, receiverPhone: TEST_PHONE });
    }

    await prisma.order.delete({ where: { orderCode } });
  }

  await prisma.user.deleteMany({
    where: {
      email: { in: [TEST_EMAIL, UNKNOWN_EMAIL] },
      orders: { none: {} },
    },
  });

  assert.deepEqual(await counts(), baselineCounts);
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('Phase 8A Member auth backend and Guest regressions', async (t) => {
  let user;
  let originalToken;
  let changedToken;
  let resetToken;

  await t.test('register validates, normalizes, hashes, and returns a safe token', async () => {
    const mismatch = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'M8A Test Member',
        email: TEST_EMAIL,
        phone: TEST_PHONE,
        password: ORIGINAL_PASSWORD,
        passwordConfirmation: 'different-password',
      },
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.error.code, 'VALIDATION_ERROR');

    for (const invalidBody of [
      {
        fullName: '', email: TEST_EMAIL, phone: TEST_PHONE,
        password: ORIGINAL_PASSWORD, passwordConfirmation: ORIGINAL_PASSWORD,
      },
      {
        fullName: 'M8A Test Member', email: 'not-an-email', phone: TEST_PHONE,
        password: ORIGINAL_PASSWORD, passwordConfirmation: ORIGINAL_PASSWORD,
      },
      {
        fullName: 'M8A Test Member', email: TEST_EMAIL, phone: '123',
        password: ORIGINAL_PASSWORD, passwordConfirmation: ORIGINAL_PASSWORD,
      },
    ]) {
      const invalid = await api('/api/auth/register', {
        method: 'POST',
        body: invalidBody,
      });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    }

    const registration = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: '  M8A Test Member  ',
        email: `  ${TEST_EMAIL.toUpperCase()}  `,
        phone: ` ${TEST_PHONE} `,
        password: ORIGINAL_PASSWORD,
        passwordConfirmation: ORIGINAL_PASSWORD,
      },
    });

    assert.equal(registration.status, 201);
    assert.equal(registration.body.data.member.email, TEST_EMAIL);
    assert.equal(registration.body.data.member.fullName, 'M8A Test Member');
    assert.equal(JSON.stringify(registration.body).includes('passwordHash'), false);
    originalToken = registration.body.data.token;

    user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    assert.ok(user);
    assert.equal(user.email, TEST_EMAIL);
    assert.notEqual(user.passwordHash, ORIGINAL_PASSWORD);
    assert.equal(await bcrypt.compare(ORIGINAL_PASSWORD, user.passwordHash), true);

    const decoded = jwt.decode(originalToken);
    assert.equal(decoded.sub, String(user.id));
    assert.equal(decoded.type, 'member');
    assert.equal(typeof decoded.pv, 'string');
    assert.equal(decoded.iss, 'steplab-api');
    assert.equal(decoded.aud, 'steplab-member');
    assert.equal(decoded.exp - decoded.iat, 8 * 60 * 60);
    for (const forbidden of ['email', 'phone', 'fullName', 'address', 'passwordHash']) {
      assert.equal(Object.hasOwn(decoded, forbidden), false);
    }

    const duplicate = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Duplicate Member',
        email: TEST_EMAIL.toUpperCase(),
        phone: '0900000099',
        password: ORIGINAL_PASSWORD,
        passwordConfirmation: ORIGINAL_PASSWORD,
      },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'ACCOUNT_EXISTS');
  });

  await t.test('login, Member JWT validation, and current profile', async () => {
    const correct = await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL.toUpperCase(), password: ORIGINAL_PASSWORD },
    });
    assert.equal(correct.status, 200);
    assert.equal(typeof correct.body.data.token, 'string');

    const wrong = await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL, password: 'wrong-password' },
    });
    const unknown = await api('/api/auth/login', {
      method: 'POST',
      body: { email: UNKNOWN_EMAIL, password: 'wrong-password' },
    });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body.error, unknown.body.error);
    assert.deepEqual(wrong.body.error, {
      code: 'INVALID_CREDENTIALS',
      message: 'Sai thông tin đăng nhập.',
    });

    const me = await api('/api/auth/me', { token: bearer(originalToken) });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.member.id, user.id);
    assert.equal(JSON.stringify(me.body).includes('passwordHash'), false);

    const missing = await api('/api/auth/me');
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.code, 'UNAUTHORIZED');

    const tokenParts = originalToken.split('.');
    tokenParts[2] = `${tokenParts[2][0] === 'a' ? 'b' : 'a'}${tokenParts[2].slice(1)}`;
    const tampered = await api('/api/auth/me', { token: bearer(tokenParts.join('.')) });
    assert.equal(tampered.status, 401);

    user = await prisma.user.findUnique({ where: { id: user.id } });
    const expiredToken = createCustomToken(user, {}, { expiresIn: -1 });
    const expired = await api('/api/auth/me', { token: bearer(expiredToken) });
    assert.equal(expired.status, 401);

    const wrongTypeToken = createCustomToken(user, { type: 'admin' });
    const wrongType = await api('/api/auth/me', { token: bearer(wrongTypeToken) });
    assert.equal(wrongType.status, 401);

    const config = getMemberAuthConfig();
    const missingUserToken = jwt.sign(
      { type: 'member', pv: derivePasswordVersion(user.passwordHash) },
      config.secret,
      {
        algorithm: 'HS256',
        subject: '2147483647',
        issuer: config.issuer,
        audience: config.audience,
        expiresIn: config.expiresIn,
      }
    );
    const missingUser = await api('/api/auth/me', { token: bearer(missingUserToken) });
    assert.equal(missingUser.status, 401);
  });

  await t.test('profile accepts only supported fields and preserves token validity', async () => {
    const update = await api('/api/auth/me', {
      method: 'PATCH',
      token: bearer(originalToken),
      body: {
        fullName: 'M8A Updated Member',
        phone: '090 000 0088',
        address: '  8A Test Address  ',
      },
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.member.fullName, 'M8A Updated Member');
    assert.equal(update.body.data.member.address, '8A Test Address');
    assert.equal(JSON.stringify(update.body).includes('passwordHash'), false);

    const protectedField = await api('/api/auth/me', {
      method: 'PATCH',
      token: bearer(originalToken),
      body: { email: 'changed@example.test' },
    });
    assert.equal(protectedField.status, 400);
    assert.equal(protectedField.body.error.code, 'VALIDATION_ERROR');

    const stillValid = await api('/api/auth/me', { token: bearer(originalToken) });
    assert.equal(stillValid.status, 200);
  });

  await t.test('password change invalidates every token carrying the old fingerprint', async () => {
    const wrongCurrent = await api('/api/auth/change-password', {
      method: 'POST',
      token: bearer(originalToken),
      body: {
        currentPassword: 'wrong-password',
        newPassword: CHANGED_PASSWORD,
        newPasswordConfirmation: CHANGED_PASSWORD,
      },
    });
    assert.equal(wrongCurrent.status, 400);
    assert.equal(wrongCurrent.body.error.code, 'PASSWORD_CHANGE_FAILED');

    const mismatch = await api('/api/auth/change-password', {
      method: 'POST',
      token: bearer(originalToken),
      body: {
        currentPassword: ORIGINAL_PASSWORD,
        newPassword: CHANGED_PASSWORD,
        newPasswordConfirmation: 'different-password',
      },
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.error.code, 'VALIDATION_ERROR');

    const before = (await prisma.user.findUnique({ where: { id: user.id } })).passwordHash;
    const changed = await api('/api/auth/change-password', {
      method: 'POST',
      token: bearer(originalToken),
      body: {
        currentPassword: ORIGINAL_PASSWORD,
        newPassword: CHANGED_PASSWORD,
        newPasswordConfirmation: CHANGED_PASSWORD,
      },
    });
    assert.equal(changed.status, 200);
    assert.equal(Object.hasOwn(changed.body.data, 'token'), false);

    const afterHash = (await prisma.user.findUnique({ where: { id: user.id } })).passwordHash;
    assert.notEqual(afterHash, before);
    assert.equal(await bcrypt.compare(CHANGED_PASSWORD, afterHash), true);

    const staleMe = await api('/api/auth/me', { token: bearer(originalToken) });
    assert.equal(staleMe.status, 401);
    assert.equal(staleMe.body.error.code, 'UNAUTHORIZED');

    const oldLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL, password: ORIGINAL_PASSWORD },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL, password: CHANGED_PASSWORD },
    });
    assert.equal(newLogin.status, 200);
    changedToken = newLogin.body.data.token;
    assert.equal((await api('/api/auth/me', { token: bearer(changedToken) })).status, 200);
  });

  await t.test('simplified forgot password is neutral and invalidates older JWTs', async () => {
    const mismatch = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: TEST_EMAIL,
        newPassword: RESET_PASSWORD,
        newPasswordConfirmation: 'different-password',
      },
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.error.code, 'VALIDATION_ERROR');

    const reset = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: TEST_EMAIL.toUpperCase(),
        newPassword: RESET_PASSWORD,
        newPasswordConfirmation: RESET_PASSWORD,
      },
    });
    const unknown = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: UNKNOWN_EMAIL,
        newPassword: RESET_PASSWORD,
        newPasswordConfirmation: RESET_PASSWORD,
      },
    });
    assert.equal(reset.status, 200);
    assert.equal(unknown.status, 200);
    assert.deepEqual(reset.body, unknown.body);
    assert.equal(await prisma.user.findUnique({ where: { email: UNKNOWN_EMAIL } }), null);

    assert.equal((await api('/api/auth/me', { token: bearer(changedToken) })).status, 401);
    assert.equal((await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL, password: CHANGED_PASSWORD },
    })).status, 401);

    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_EMAIL, password: RESET_PASSWORD },
    });
    assert.equal(login.status, 200);
    resetToken = login.body.data.token;
    assert.equal((await api('/api/auth/me', { token: bearer(resetToken) })).status, 200);
  });

  await t.test('strict optional Member middleware never downgrades invalid credentials', async () => {
    const guest = await runMiddleware(strictOptionalMember);
    assert.equal(guest.error, undefined);
    assert.equal(guest.member, null);

    const member = await runMiddleware(strictOptionalMember, bearer(resetToken));
    assert.equal(member.error, undefined);
    assert.deepEqual(member.member, { id: user.id });

    const malformed = await runMiddleware(strictOptionalMember, 'Token invalid');
    assert.equal(malformed.error.code, 'UNAUTHORIZED');

    user = await prisma.user.findUnique({ where: { id: user.id } });
    const expiredToken = createCustomToken(user, {}, { expiresIn: -1 });
    const expired = await runMiddleware(strictOptionalMember, bearer(expiredToken));
    assert.equal(expired.error.code, 'UNAUTHORIZED');

    const stale = await runMiddleware(strictOptionalMember, bearer(changedToken));
    assert.equal(stale.error.code, 'UNAUTHORIZED');

    const requiredMissing = await runMiddleware(requireMember);
    assert.equal(requiredMissing.error.code, 'UNAUTHORIZED');
  });

  await t.test('existing Guest endpoints remain operational and orders stay unlinked', async () => {
    const health = await api('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const variants = await prisma.variant.findMany({
      where: { stock: { gt: 0 } },
      include: {
        colorway: {
          include: {
            product: { include: { brand: true } },
          },
        },
      },
      take: 50,
    });
    const variant = variants.find((candidate) => (
      candidate.colorway.isActive
      && candidate.colorway.product.isActive
      && candidate.colorway.product.brand.isActive
    ));
    assert.ok(variant);
    const stockBefore = variant.stock;

    const item = {
      productSlug: variant.colorway.product.slug,
      colorwaySlug: variant.colorway.slug,
      size: variant.size,
      quantity: 1,
    };
    const quote = await api('/api/checkout/quote', {
      method: 'POST',
      body: { items: [item] },
    });
    assert.equal(quote.status, 200);

    const quotedItem = quote.body.data.items[0];
    const created = await api('/api/orders', {
      method: 'POST',
      body: {
        receiverName: 'M8A Integration Test',
        receiverPhone: TEST_PHONE,
        receiverAddress: 'M8A Test Address',
        note: null,
        items: [{
          ...item,
          expectedUnitPrice: quotedItem.unitPrice,
        }],
        expectedShippingFee: quote.body.data.shippingFee,
      },
    });
    assert.equal(created.status, 201);
    const orderCode = created.body.data.orderCode;
    createdOrderCodes.add(orderCode);

    const databaseOrder = await prisma.order.findUnique({ where: { orderCode } });
    assert.equal(databaseOrder.userId, null);

    const lookup = await api('/api/orders/lookup', {
      method: 'POST',
      body: { orderCode, receiverPhone: TEST_PHONE },
    });
    assert.equal(lookup.status, 200);

    const cancelled = await api(`/api/orders/${orderCode}/cancel`, {
      method: 'POST',
      body: { receiverPhone: TEST_PHONE },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, 'CANCELLED');

    const variantAfter = await prisma.variant.findUnique({ where: { id: variant.id } });
    assert.equal(variantAfter.stock, stockBefore);
  });
});
