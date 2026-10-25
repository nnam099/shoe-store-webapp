import prisma from '../config/db.js';

/**
 * Combines completed sales grouped by Variant into deterministic Product totals.
 * Kept pure so the aggregation and tie-ordering contract can be unit tested.
 */
export function aggregateProductSales(variantSales, variants) {
  const productIdByVariantId = new Map(
    variants.map((variant) => [variant.id, variant.colorway.productId])
  );
  const totals = new Map();

  for (const entry of variantSales) {
    const productId = productIdByVariantId.get(entry.variantId);
    if (productId === undefined) continue;
    totals.set(productId, (totals.get(productId) ?? 0) + (entry._sum.quantity ?? 0));
  }

  return [...totals.entries()]
    .map(([productId, quantitySold]) => ({ productId, quantitySold }))
    .filter((entry) => entry.quantitySold > 0)
    .sort((left, right) => (
      right.quantitySold - left.quantitySold || left.productId - right.productId
    ));
}

/**
 * Returns all Product sales ranked by quantity from COMPLETED Orders only.
 * Callers apply their own visibility rules and result limits.
 */
export async function listCompletedProductSales() {
  const variantSales = await prisma.orderItem.groupBy({
    by: ['variantId'],
    where: { order: { status: 'COMPLETED' } },
    _sum: { quantity: true },
  });

  if (variantSales.length === 0) return [];

  const variants = await prisma.variant.findMany({
    where: { id: { in: variantSales.map((entry) => entry.variantId) } },
    select: {
      id: true,
      colorway: { select: { productId: true } },
    },
  });

  return aggregateProductSales(variantSales, variants);
}
