import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_MEMBER_SECRET ||= 'unit-test-member-secret-with-at-least-32-characters';

test('B1 JWT supports passwordless accounts through authVersion', async () => {
  const { issueMemberToken, verifyMemberToken } = await import('../src/utils/memberToken.js');
  const token = issueMemberToken({ id: 42, authVersion: 3, passwordHash: null });
  const claims = verifyMemberToken(token);
  assert.equal(claims.userId, 42);
  assert.equal(claims.authVersion, 3);
  assert.equal(claims.passwordVersion, null);
});

test('B2 opaque secrets are hashed and compared without persisting plaintext', async () => {
  const { createOpaqueToken, hashOpaqueToken, constantTimeEqual } = await import('../src/utils/secureToken.js');
  const token = createOpaqueToken();
  const hash = hashOpaqueToken(token);
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  assert.equal(constantTimeEqual(hash, hashOpaqueToken(token)), true);
  assert.equal(constantTimeEqual(hash, hashOpaqueToken(`${token}x`)), false);
});

test('email templates escape dynamic HTML', async () => {
  const { renderOrderCreatedEmail } = await import('../src/email/templates.js');
  const rendered = renderOrderCreatedEmail({
    trackingUrl: 'https://example.test/order-lookup?orderCode=SL-1',
    order: {
      orderCode: 'SL-1', subtotal: 1, shippingFee: 1, total: 2,
      receiverName: '<script>alert(1)</script>', receiverPhone: '0900000000',
      receiverAddress: '<b>address</b>',
      items: [{ productName: '<img>', colorwayName: 'Black', size: '42', quantity: 1, lineTotal: 1 }],
    },
  });
  assert.equal(rendered.html.includes('<script>'), false);
  assert.equal(rendered.html.includes('<img>'), false);
  assert.match(rendered.html, /&lt;script&gt;/);
});
