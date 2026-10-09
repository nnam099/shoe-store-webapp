import { computeCheckoutQuote, createGuestOrder } from '../services/order.service.js';

/**
 * Controller for POST /api/checkout/quote
 */
export async function getQuote(req, res, next) {
  try {
    const { items } = req.body || {};
    const quote = await computeCheckoutQuote(items);
    res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for POST /api/orders
 */
export async function createOrder(req, res, next) {
  try {
    const orderData = req.body || {};
    const result = await createGuestOrder(orderData);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
