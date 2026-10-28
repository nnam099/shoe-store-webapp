import {
  computeCheckoutQuote,
  lookupGuestOrder,
  cancelGuestOrder,
  confirmGuestOrderReceived,
  listOrdersForMember,
  getOrderForMember,
  cancelOrderForMember,
  confirmMemberOrderReceived,
} from '../services/order.service.js';
import {
  confirmCodOrder,
  createCheckoutIntent,
  getCheckoutIntent,
  sendCheckoutOtp,
  updateCheckoutIntent,
  verifyCheckoutOtp,
} from '../services/checkout-intent.service.js';
import { normalizeClientIp } from '../services/security-throttle.service.js';
import { AppError } from '../utils/errors.js';

function checkoutActor(req) {
  return {
    memberId: req.member?.id ?? null,
    guestToken: typeof req.headers['x-checkout-token'] === 'string'
      ? req.headers['x-checkout-token']
      : null,
  };
}

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
    const { checkoutIntentId, acceptedQuoteVersion } = req.body || {};
    if (!checkoutIntentId) {
      throw new AppError('Checkout Intent đã xác thực là bắt buộc.', 409, 'CHECKOUT_INTENT_REQUIRED');
    }
    const result = await confirmCodOrder(
      checkoutIntentId,
      { acceptedQuoteVersion },
      checkoutActor(req)
    );
    res.status(result.idempotentReplay ? 200 : 201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function createIntent(req, res, next) {
  try {
    const result = await createCheckoutIntent(req.body || {}, { memberId: req.member?.id ?? null });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function readIntent(req, res, next) {
  try {
    const result = await getCheckoutIntent(req.params.intentId, checkoutActor(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function patchIntent(req, res, next) {
  try {
    const result = await updateCheckoutIntent(req.params.intentId, req.body || {}, checkoutActor(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function sendIntentOtp(req, res, next) {
  try {
    const result = await sendCheckoutOtp(req.params.intentId, checkoutActor(req), { ip: normalizeClientIp(req) });
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function verifyIntentOtp(req, res, next) {
  try {
    const result = await verifyCheckoutOtp(req.params.intentId, req.body || {}, checkoutActor(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function confirmIntentCod(req, res, next) {
  try {
    const result = await confirmCodOrder(req.params.intentId, req.body || {}, checkoutActor(req));
    res.status(result.idempotentReplay ? 200 : 201).json({ success: true, data: result });
  } catch (error) {
    next(error);
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
