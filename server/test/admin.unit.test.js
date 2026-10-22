import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  deriveAdminPasswordVersion,
  isCurrentAdminPasswordVersion,
  issueAdminToken,
  verifyAdminToken,
} from '../src/utils/adminToken.js';
import {
  getColorwayReadinessIssues,
  getProductReadinessIssues,
  validateColorFamilies,
  validatePrices,
} from '../src/utils/catalogPolicy.js';
import { managedPathFromUrl, validateImageFile } from '../src/utils/managedImages.js';
import { requireAdmin } from '../src/middlewares/adminAuth.js';

process.env.JWT_ADMIN_SECRET = 'admin-unit-test-secret-with-at-least-32-characters';
process.env.JWT_ADMIN_EXPIRES_IN = '8h';

test('Admin JWT has minimal typed claims and password-version invalidation', () => {
  const admin = { id: 17, passwordHash: '$2b$12$first-hash' };
  const token = issueAdminToken(admin);
  const decoded = jwt.decode(token);
  assert.equal(decoded.sub, '17');
  assert.equal(decoded.type, 'admin');
  assert.equal(decoded.pv, deriveAdminPasswordVersion(admin.passwordHash));
  assert.equal(Object.hasOwn(decoded, 'email'), false);
  assert.deepEqual(verifyAdminToken(token), { adminId: 17, passwordVersion: decoded.pv });
  assert.equal(isCurrentAdminPasswordVersion(decoded.pv, admin.passwordHash), true);
  assert.equal(isCurrentAdminPasswordVersion(decoded.pv, '$2b$12$changed-hash'), false);
});

test('Admin verifier rejects a correctly signed token with the wrong type', () => {
  const token = jwt.sign(
    { type: 'member', pv: 'x'.repeat(32) },
    process.env.JWT_ADMIN_SECRET,
    { subject: '1', issuer: 'steplab-api', audience: 'steplab-admin', expiresIn: '1h' }
  );
  assert.throws(() => verifyAdminToken(token), /Invalid Admin token claims/);
});

test('Admin middleware rejects missing and wrong-type credentials before database access', async () => {
  const invoke = (authorization) => new Promise((resolve) => {
    requireAdmin({ headers: authorization ? { authorization } : {} }, {}, resolve);
  });
  const missing = await invoke(null);
  assert.equal(missing.code, 'UNAUTHORIZED');
  const wrongType = jwt.sign(
    { type: 'member', pv: 'x'.repeat(32) },
    process.env.JWT_ADMIN_SECRET,
    { subject: '1', issuer: 'steplab-api', audience: 'steplab-admin', expiresIn: '1h' }
  );
  const wrong = await invoke(`Bearer ${wrongType}`);
  assert.equal(wrong.code, 'UNAUTHORIZED');
});

test('Catalog policy validates price and controlled color families', () => {
  assert.deepEqual(validatePrices(2_000_000, 1_500_000), { price: 2_000_000, salePrice: 1_500_000 });
  assert.throws(() => validatePrices(100, 100), (error) => error.code === 'VALIDATION_ERROR');
  assert.deepEqual(validateColorFamilies(['white', 'black']), ['white', 'black']);
  assert.throws(() => validateColorFamilies(['unknown']), (error) => error.code === 'VALIDATION_ERROR');
});

test('Published readiness requires brand, category, active default, gallery, thumbnail and variant', () => {
  const validColorway = {
    id: 4,
    isActive: true,
    isDefault: true,
    colorFamilies: ['black'],
    images: [
      { isThumbnail: true }, { isThumbnail: false }, { isThumbnail: false },
    ],
    variants: [{ size: '41', stock: 0 }],
  };
  assert.deepEqual(getColorwayReadinessIssues(validColorway), []);
  assert.deepEqual(getProductReadinessIssues({
    brand: { isActive: true },
    productCategories: [{}],
    colorways: [validColorway],
  }), []);
  assert.ok(getColorwayReadinessIssues({ ...validColorway, images: [] }).length > 0);
});

test('Image signatures must agree with their declared MIME type', () => {
  const jpeg = { mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) };
  const png = { mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) };
  const webp = { mimetype: 'image/webp', buffer: Buffer.from('RIFF0000WEBP') };
  const avifBuffer = Buffer.alloc(24);
  avifBuffer.writeUInt32BE(24, 0);
  avifBuffer.write('ftyp', 4, 'ascii');
  avifBuffer.write('mif1', 8, 'ascii');
  avifBuffer.write('miaf', 16, 'ascii');
  avifBuffer.write('avif', 20, 'ascii');
  const avif = { mimetype: 'image/avif', buffer: avifBuffer };
  const nonAvifBmff = Buffer.from(avifBuffer);
  nonAvifBmff.write('heic', 20, 'ascii');
  assert.equal(validateImageFile(jpeg), 'jpg');
  assert.equal(validateImageFile(png), 'png');
  assert.equal(validateImageFile(webp), 'webp');
  assert.equal(validateImageFile(avif), 'avif');
  assert.throws(
    () => validateImageFile({ mimetype: 'image/png', buffer: jpeg.buffer }),
    (error) => error.code === 'INVALID_IMAGE_TYPE'
  );
  assert.throws(
    () => validateImageFile({ mimetype: 'image/avif', buffer: png.buffer }),
    (error) => error.code === 'INVALID_IMAGE_TYPE'
  );
  assert.throws(
    () => validateImageFile({ mimetype: 'image/png', buffer: avif.buffer }),
    (error) => error.code === 'INVALID_IMAGE_TYPE'
  );
  assert.throws(
    () => validateImageFile({ mimetype: 'image/avif', buffer: nonAvifBmff }),
    (error) => error.code === 'INVALID_IMAGE_TYPE'
  );
  assert.equal(managedPathFromUrl('/images/products/seeded.webp'), null);
  assert.equal(managedPathFromUrl('/api/uploads/.gitkeep'), null);
  assert.match(
    managedPathFromUrl('/api/uploads/products/123e4567-e89b-42d3-a456-426614174000.webp'),
    /uploads[\\/]products[\\/]123e4567/
  );
  assert.match(
    managedPathFromUrl('/api/uploads/brands/123e4567-e89b-42d3-a456-426614174000.avif'),
    /uploads[\\/]brands[\\/]123e4567/
  );
});
