import {
  computeCheckoutQuote,
  createOrder as createOrderService,
  lookupGuestOrder,
  cancelGuestOrder,
  confirmGuestOrderReceived,
  listOrdersForMember,
  getOrderForMember,
  cancelOrderForMember,
  confirmMemberOrderReceived,
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
    const result = await createOrderService(orderData, {
      memberId: req.member?.id ?? null,
    });
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for GET /api/member/orders
 */
export async function listMemberOrders(req, res, next) {
  try {
    const result = await listOrdersForMember(req.member.id, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for GET /api/member/orders/:orderCode
 */
export async function getMemberOrder(req, res, next) {
  try {
    const result = await getOrderForMember({
      memberId: req.member.id,
      orderCode: req.params.orderCode,
    });
    res.status(200).json({
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

/**
 * Controller for POST /api/member/orders/:orderCode/cancel
 */
export async function cancelMemberOrder(req, res, next) {
  try {
    const result = await cancelOrderForMember({
      memberId: req.member.id,
      orderCode: req.params.orderCode,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for POST /api/orders/:orderCode/confirm-received
 */
export async function confirmReceivedOrder(req, res, next) {
  try {
    const result = await confirmGuestOrderReceived({
      orderCode: req.params.orderCode,
      receiverPhone: req.body?.receiverPhone,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for POST /api/member/orders/:orderCode/confirm-received
 */
export async function confirmReceivedMemberOrder(req, res, next) {
  try {
    const result = await confirmMemberOrderReceived({
      memberId: req.member.id,
      orderCode: req.params.orderCode,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
