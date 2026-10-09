import { Router } from 'express';
import {
  getQuote,
  createOrder,
  lookupOrder,
  cancelOrder,
} from '../controllers/order.controller.js';

const router = Router();

router.post('/checkout/quote', getQuote);
router.post('/orders', createOrder);
router.post('/orders/lookup', lookupOrder);
router.post('/orders/:orderCode/cancel', cancelOrder);

export default router;
