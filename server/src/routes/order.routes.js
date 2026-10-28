import { Router } from 'express';
import {
  getQuote,
  createOrder,
  createIntent,
  readIntent,
  patchIntent,
  sendIntentOtp,
  verifyIntentOtp,
  confirmIntentCod,
  lookupOrder,
  cancelOrder,
  confirmReceivedOrder,
  listMemberOrders,
  getMemberOrder,
  cancelMemberOrder,
  confirmReceivedMemberOrder,
} from '../controllers/order.controller.js';
import {
  requireMember,
  strictOptionalMember,
} from '../middlewares/memberAuth.js';

const router = Router();

router.post('/checkout/quote', getQuote);
router.post('/checkout/intents', strictOptionalMember, createIntent);
router.get('/checkout/intents/:intentId', strictOptionalMember, readIntent);
router.patch('/checkout/intents/:intentId', strictOptionalMember, patchIntent);
router.post('/checkout/intents/:intentId/email-otp/send', strictOptionalMember, sendIntentOtp);
router.post('/checkout/intents/:intentId/email-otp/verify', strictOptionalMember, verifyIntentOtp);
router.post('/checkout/intents/:intentId/confirm-cod', strictOptionalMember, confirmIntentCod);
router.post('/orders', strictOptionalMember, createOrder);
router.post('/orders/lookup', lookupOrder);
router.post('/orders/:orderCode/cancel', cancelOrder);
router.post('/orders/:orderCode/confirm-received', confirmReceivedOrder);

router.get('/member/orders', requireMember, listMemberOrders);
router.get('/member/orders/:orderCode', requireMember, getMemberOrder);
router.post('/member/orders/:orderCode/cancel', requireMember, cancelMemberOrder);
router.post(
  '/member/orders/:orderCode/confirm-received',
  requireMember,
  confirmReceivedMemberOrder
);

export default router;
