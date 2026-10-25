import { Router } from 'express';
import {
  getBestSellers,
  getOptions,
  getProduct,
  listProducts,
} from '../controllers/catalog.controller.js';

const router = Router();

router.get('/catalog/options', getOptions);
router.get('/catalog/best-sellers', getBestSellers);
router.get('/catalog/products', listProducts);
router.get('/catalog/products/:slug', getProduct);

export default router;
