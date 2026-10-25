import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateProductSales } from '../src/services/product-sales.service.js';

test('completed Variant quantities aggregate under Product and rank deterministically', () => {
  const result = aggregateProductSales(
    [
      { variantId: 11, _sum: { quantity: 2 } },
      { variantId: 12, _sum: { quantity: 3 } },
      { variantId: 21, _sum: { quantity: 5 } },
      { variantId: 31, _sum: { quantity: 1 } },
    ],
    [
      { id: 11, colorway: { productId: 2 } },
      { id: 12, colorway: { productId: 2 } },
      { id: 21, colorway: { productId: 1 } },
      { id: 31, colorway: { productId: 3 } },
    ]
  );

  assert.deepEqual(result, [
    { productId: 1, quantitySold: 5 },
    { productId: 2, quantitySold: 5 },
    { productId: 3, quantitySold: 1 },
  ]);
});

test('invalid, missing and zero sales do not create ranked Products', () => {
  const result = aggregateProductSales(
    [
      { variantId: 10, _sum: { quantity: null } },
      { variantId: 99, _sum: { quantity: 8 } },
    ],
    [{ id: 10, colorway: { productId: 1 } }]
  );

  assert.deepEqual(result, []);
});
