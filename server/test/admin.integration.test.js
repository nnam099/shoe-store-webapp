import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';
import { assertIsolatedTestDatabase } from './testDatabaseGuard.js';

process.env.JWT_ADMIN_SECRET ||= 'admin-integration-secret-with-at-least-32-characters';
process.env.JWT_ADMIN_EXPIRES_IN = '8h';

const runId = `${Date.now()}-${process.pid}`;
const prefix = `admin-it-${runId}`;
const email = `${prefix}@example.test`;
const password = 'AdminTestPassword123';
let server;
let baseUrl;
let adminId;
let token;
let isolationGuardPassed = false;
const created = { brandId: null, categoryId: null, productId: null };

async function api(path, { method = 'GET', body, auth = token, form } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: form || (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  await assertIsolatedTestDatabase(prisma);
  isolationGuardPassed = true;

  const admin = await prisma.adminAccount.create({
    data: { email, fullName: 'Admin Integration Test', passwordHash: await hashPassword(password), isActive: true },
  });
  adminId = admin.id;
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!isolationGuardPassed) {
    await prisma.$disconnect();
    return;
  }
  if (created.productId) {
    const product = await prisma.product.findUnique({ where: { id: created.productId }, include: { colorways: { include: { variants: true } } } });
    if (product) {
      await prisma.variant.deleteMany({ where: { colorway: { productId: product.id } } });
      await prisma.colorway.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
    }
  }
  if (created.categoryId) await prisma.category.deleteMany({ where: { id: created.categoryId } });
  if (created.brandId) await prisma.brand.deleteMany({ where: { id: created.brandId } });
  if (adminId) await prisma.adminAccount.deleteMany({ where: { id: adminId } });
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('Admin auth rejects unauthenticated access and returns a safe token/profile', async () => {
  const missing = await api('/api/admin/auth/me', { auth: null });
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, 'UNAUTHORIZED');

  const wrong = await api('/api/admin/auth/login', { method: 'POST', auth: null, body: { email, password: 'wrong-password' } });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS');

  const login = await api('/api/admin/auth/login', { method: 'POST', auth: null, body: { email: email.toUpperCase(), password } });
  assert.equal(login.status, 200);
  token = login.body.data.token;
  assert.equal(login.body.data.admin.email, email);
  assert.equal(JSON.stringify(login.body).includes('passwordHash'), false);

  const me = await api('/api/admin/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.data.admin.id, adminId);
});

test('Admin account management enforces self safeguards and safe serialization', async () => {
  const createdAccount = await api('/api/admin/accounts', {
    method: 'POST',
    body: {
      email: `${prefix}-secondary@example.test`,
      fullName: 'Secondary Admin',
      password: 'SecondaryAdmin123',
      passwordConfirmation: 'SecondaryAdmin123',
    },
  });
  assert.equal(createdAccount.status, 201);
  assert.equal(JSON.stringify(createdAccount.body).includes('passwordHash'), false);
  const secondaryId = createdAccount.body.data.admin.id;

  const selfDeactivate = await api(`/api/admin/accounts/${adminId}`, { method: 'PATCH', body: { isActive: false } });
  assert.equal(selfDeactivate.status, 409);
  assert.equal(selfDeactivate.body.error.code, 'SELF_MANAGEMENT_NOT_ALLOWED');

  const selfReset = await api(`/api/admin/accounts/${adminId}/reset-password`, {
    method: 'POST',
    body: { newPassword: 'AnotherAdminPassword123', newPasswordConfirmation: 'AnotherAdminPassword123' },
  });
  assert.equal(selfReset.status, 409);
  assert.equal(selfReset.body.error.code, 'SELF_MANAGEMENT_NOT_ALLOWED');

  assert.equal((await api(`/api/admin/accounts/${secondaryId}`, { method: 'DELETE' })).status, 200);
});

test('Admin catalog workflow preserves public visibility and optimistic stock', async () => {
  const brand = await api('/api/admin/brands', { method: 'POST', body: { name: 'Admin IT Brand', slug: `${prefix}-brand` } });
  assert.equal(brand.status, 201);
  created.brandId = brand.body.data.brand.id;

  const category = await api('/api/admin/categories', { method: 'POST', body: { name: 'Admin IT Category', slug: `${prefix}-category` } });
  assert.equal(category.status, 201);
  created.categoryId = category.body.data.category.id;

  const product = await api('/api/admin/products', {
    method: 'POST',
    body: { name: 'Admin IT Product', slug: `${prefix}-product`, brandId: created.brandId, categoryIds: [created.categoryId], isFeatured: true },
  });
  assert.equal(product.status, 201);
  assert.equal(product.body.data.product.isActive, false);
  created.productId = product.body.data.product.id;

  const colorway = await api(`/api/admin/products/${created.productId}/colorways`, {
    method: 'POST',
    body: { name: 'Test White', slug: 'test-white', colorFamilies: ['white'], price: 2_000_000, salePrice: 1_500_000 },
  });
  assert.equal(colorway.status, 201);
  const colorwayId = colorway.body.data.colorway.id;

  const prematureActivation = await api(`/api/admin/colorways/${colorwayId}`, { method: 'PATCH', body: { isActive: true } });
  assert.equal(prematureActivation.status, 409);
  assert.equal(prematureActivation.body.error.code, 'COLORWAY_NOT_READY');

  assert.equal((await api(`/api/admin/brands/${created.brandId}`, { method: 'DELETE' })).body.error.code, 'BRAND_IN_USE');
  assert.equal((await api(`/api/admin/categories/${created.categoryId}`, { method: 'DELETE' })).body.error.code, 'CATEGORY_IN_USE');

  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const invalidForm = new FormData();
  invalidForm.append('image', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'fake.png');
  const invalidImage = await api(`/api/admin/colorways/${colorwayId}/images`, { method: 'POST', form: invalidForm });
  assert.equal(invalidImage.status, 415);
  assert.equal(invalidImage.body.error.code, 'INVALID_IMAGE_TYPE');

  for (let index = 1; index <= 3; index += 1) {
    const form = new FormData();
    form.append('image', new Blob([png], { type: 'image/png' }), `image-${index}.png`);
    form.append('displayOrder', String(index));
    form.append('isThumbnail', String(index === 1));
    const image = await api(`/api/admin/colorways/${colorwayId}/images`, { method: 'POST', form });
    assert.equal(image.status, 201);
    assert.match(image.body.data.image.imageUrl, /^\/api\/uploads\/products\//);
  }

  const draftDetail = await api(`/api/admin/products/${created.productId}`);
  const uploadedImages = draftDetail.body.data.product.colorways[0].images;
  const reordered = await api(`/api/admin/colorways/${colorwayId}/images/order`, {
    method: 'PUT',
    body: {
      images: [...uploadedImages].reverse().map((image, index) => ({ id: image.id, displayOrder: index + 1 })),
      thumbnailImageId: uploadedImages[2].id,
    },
  });
  assert.equal(reordered.status, 200);
  assert.equal(reordered.body.data.images.find((image) => image.isThumbnail).id, uploadedImages[2].id);

  const variant = await api(`/api/admin/colorways/${colorwayId}/variants`, { method: 'POST', body: { size: '41', stock: 5 } });
  assert.equal(variant.status, 201);
  const variantId = variant.body.data.variant.id;

  const activateColorway = await api(`/api/admin/colorways/${colorwayId}`, { method: 'PATCH', body: { isActive: true } });
  assert.equal(activateColorway.status, 200);
  assert.equal((await api(`/api/admin/colorways/${colorwayId}/set-default`, { method: 'POST' })).status, 200);
  assert.equal((await api(`/api/admin/products/${created.productId}`, { method: 'PATCH', body: { isActive: true } })).status, 200);

  const publicDetail = await api(`/api/catalog/products/${prefix}-product`, { auth: null });
  assert.equal(publicDetail.status, 200);
  assert.deepEqual(publicDetail.body.data.product.colorways[0].variants, [{ size: '41', stock: 5 }]);
  const colorFilter = await api(`/api/catalog/products?color=white&q=${encodeURIComponent('Admin IT Product')}`, { auth: null });
  assert.equal(colorFilter.status, 200);
  assert.equal(colorFilter.body.data.pagination.totalItems, 1);

  const changedStock = await api(`/api/admin/variants/${variantId}/stock`, { method: 'PATCH', body: { expectedStock: 5, stock: 4 } });
  assert.equal(changedStock.status, 200);
  const conflict = await api(`/api/admin/variants/${variantId}/stock`, { method: 'PATCH', body: { expectedStock: 5, stock: 3 } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'STOCK_CONFLICT');
  assert.equal(conflict.body.error.details.currentStock, 4);

  const blockedVariantDelete = await api(`/api/admin/variants/${variantId}`, { method: 'DELETE' });
  assert.equal(blockedVariantDelete.status, 409);
  assert.equal(blockedVariantDelete.body.error.code, 'PRODUCT_NOT_READY');

  const blockedDefaultDeactivate = await api(`/api/admin/colorways/${colorwayId}`, { method: 'PATCH', body: { isActive: false } });
  assert.equal(blockedDefaultDeactivate.status, 409);
  assert.equal(blockedDefaultDeactivate.body.error.code, 'DEFAULT_COLORWAY_REQUIRED');

  const detail = await api(`/api/admin/products/${created.productId}`);
  const thumbnailId = detail.body.data.product.colorways[0].images.find((image) => image.isThumbnail).id;
  const blockedImageDelete = await api(`/api/admin/images/${thumbnailId}`, { method: 'DELETE' });
  assert.equal(blockedImageDelete.status, 409);
  assert.equal(blockedImageDelete.body.error.code, 'PRODUCT_NOT_READY');

  assert.equal((await api(`/api/admin/products/${created.productId}`, { method: 'PATCH', body: { isActive: false } })).status, 200);
  assert.equal((await api(`/api/catalog/products/${prefix}-product`, { auth: null })).status, 404);

  assert.equal((await api(`/api/admin/products/${created.productId}`, { method: 'DELETE' })).status, 200);
  created.productId = null;
  assert.equal((await api(`/api/admin/categories/${created.categoryId}`, { method: 'DELETE' })).status, 200);
  created.categoryId = null;
  assert.equal((await api(`/api/admin/brands/${created.brandId}`, { method: 'DELETE' })).status, 200);
  created.brandId = null;
});

test('Changing Admin password invalidates the previous JWT', async () => {
  const oldToken = token;
  const newPassword = 'AdminChangedPassword123';
  const changed = await api('/api/admin/auth/change-password', {
    method: 'POST',
    body: { currentPassword: password, newPassword, newPasswordConfirmation: newPassword },
  });
  assert.equal(changed.status, 200);
  assert.equal(Object.hasOwn(changed.body.data, 'token'), false);
  assert.equal((await api('/api/admin/auth/me', { auth: oldToken })).status, 401);

  const oldLogin = await api('/api/admin/auth/login', { method: 'POST', auth: null, body: { email, password } });
  assert.equal(oldLogin.status, 401);
  const newLogin = await api('/api/admin/auth/login', { method: 'POST', auth: null, body: { email, password: newPassword } });
  assert.equal(newLogin.status, 200);
  token = newLogin.body.data.token;
});
