import { Router } from 'express';
import {
  getOptions,
  getProduct,
  listProducts,
} from '../controllers/catalog.controller.js';

const router = Router();

router.get('/catalog/options', getOptions);
router.get('/catalog/products', listProducts);
router.get('/catalog/products/:slug', getProduct);

export default router;
