import {
  computeCheckoutQuote,
  createGuestOrder,
  lookupGuestOrder,
  cancelGuestOrder,
} from '../services/order.service.js';

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

/**
 * Controller for POST /api/orders/lookup
 */
export async function lookupOrder(req, res, next) {
  try {
    const { orderCode, receiverPhone } = req.body || {};
    const result = await lookupGuestOrder({ orderCode, receiverPhone });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for POST /api/orders/:orderCode/cancel
 */
export async function cancelOrder(req, res, next) {
  try {
    const { orderCode } = req.params;
    const { receiverPhone } = req.body || {};
    const result = await cancelGuestOrder({ orderCode, receiverPhone });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
