import { Router } from 'express';
import { getQuote, createOrder } from '../controllers/order.controller.js';

const router = Router();

router.post('/checkout/quote', getQuote);
router.post('/orders', createOrder);

export default router;
