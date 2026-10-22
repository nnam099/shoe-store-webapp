import { Router } from 'express';
import { requireAdmin } from '../middlewares/adminAuth.js';
import { uploadSingleImage } from '../middlewares/imageUpload.js';
import * as controller from '../controllers/admin.controller.js';

const router = Router();

router.post('/admin/auth/login', controller.adminLogin);
router.use('/admin', requireAdmin);

router.get('/admin/auth/me', controller.adminMe);
router.post('/admin/auth/change-password', controller.adminChangePassword);

router.get('/admin/accounts', controller.adminAccountList);
router.post('/admin/accounts', controller.adminAccountCreate);
router.get('/admin/accounts/:adminId', controller.adminAccountDetail);
router.patch('/admin/accounts/:adminId', controller.adminAccountUpdate);
router.post('/admin/accounts/:adminId/reset-password', controller.adminAccountResetPassword);
router.delete('/admin/accounts/:adminId', controller.adminAccountDelete);

router.get('/admin/brands', controller.adminBrandList);
router.post('/admin/brands', controller.adminBrandCreate);
router.get('/admin/brands/:brandId', controller.adminBrandDetail);
router.patch('/admin/brands/:brandId', controller.adminBrandUpdate);
router.delete('/admin/brands/:brandId', controller.adminBrandDelete);
router.post('/admin/brands/:brandId/logo', uploadSingleImage, controller.adminBrandLogoUpload);
router.delete('/admin/brands/:brandId/logo', controller.adminBrandLogoDelete);

router.get('/admin/categories', controller.adminCategoryList);
router.post('/admin/categories', controller.adminCategoryCreate);
router.get('/admin/categories/:categoryId', controller.adminCategoryDetail);
router.patch('/admin/categories/:categoryId', controller.adminCategoryUpdate);
router.delete('/admin/categories/:categoryId', controller.adminCategoryDelete);

router.get('/admin/catalog/meta', controller.adminCatalogMeta);
router.get('/admin/products', controller.adminProductList);
router.post('/admin/products', controller.adminProductCreate);
router.get('/admin/products/:productId', controller.adminProductDetail);
router.patch('/admin/products/:productId', controller.adminProductUpdate);
router.delete('/admin/products/:productId', controller.adminProductDelete);

router.post('/admin/products/:productId/colorways', controller.adminColorwayCreate);
router.get('/admin/colorways/:colorwayId', controller.adminColorwayDetail);
router.patch('/admin/colorways/:colorwayId', controller.adminColorwayUpdate);
router.post('/admin/colorways/:colorwayId/set-default', controller.adminColorwaySetDefault);
router.delete('/admin/colorways/:colorwayId', controller.adminColorwayDelete);

router.post('/admin/colorways/:colorwayId/images', uploadSingleImage, controller.adminImageUpload);
router.put('/admin/colorways/:colorwayId/images/order', controller.adminImageOrder);
router.delete('/admin/images/:imageId', controller.adminImageDelete);

router.post('/admin/colorways/:colorwayId/variants', controller.adminVariantCreate);
router.patch('/admin/variants/:variantId', controller.adminVariantUpdate);
router.patch('/admin/variants/:variantId/stock', controller.adminVariantStock);
router.delete('/admin/variants/:variantId', controller.adminVariantDelete);

export default router;
