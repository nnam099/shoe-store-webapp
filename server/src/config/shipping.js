/**
 * Shipping fee configuration.
 * Backend is the single source of truth.
 * Approved standard shipping fee: 30,000 VND.
 */

const parsedEnvFee = parseInt(process.env.SHIPPING_FEE, 10);
export const SHIPPING_FEE = !isNaN(parsedEnvFee) && parsedEnvFee >= 0 ? parsedEnvFee : 30000;

export function getShippingFee() {
  return SHIPPING_FEE;
}
