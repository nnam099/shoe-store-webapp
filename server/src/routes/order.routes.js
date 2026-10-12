import { Router } from 'express';
import {
  getQuote,
  createOrder,
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
