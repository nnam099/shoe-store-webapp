import { changeAdminPassword, getCurrentAdmin, loginAdmin } from '../services/admin-auth.service.js';
import {
  createAdminAccount, deleteAdminAccount, getAdminAccount, listAdminAccounts,
  resetAdminPassword, updateAdminAccount,
} from '../services/admin-account.service.js';
import {
  createBrand, createCategory, deleteBrand, deleteCategory, getBrand, getCategory,
  listBrands, listCategories, removeBrandLogo, updateBrand, updateCategory, uploadBrandLogo,
} from '../services/admin-taxonomy.service.js';
import {
  createColorway, createProduct, createVariant, deleteColorway, deleteProduct,
  deleteProductImage, deleteVariant, getAdminCatalogMeta, getColorway, getProduct,
  listProducts, reorderColorwayImages, setDefaultColorway, updateColorway,
  updateProduct, updateVariant, updateVariantStock, uploadColorwayImage,
} from '../services/admin-product.service.js';
import {
  getAdminOrder, listAdminOrders, updateAdminOrderStatus,
} from '../services/admin-order.service.js';
import {
  getAdminCustomer, listAdminCustomerOrders, listAdminCustomers,
} from '../services/admin-customer.service.js';
import {
  deleteAdminReview, getAdminReview, listAdminReviews,
} from '../services/admin-review.service.js';
import {
  getAdminDashboardSummary, getAdminRevenueChart,
} from '../services/admin-dashboard.service.js';

function action(fn, { status = 200, key = null } = {}) {
  return async (req, res, next) => {
    try {
      const result = await fn(req);
      res.status(status).json({ success: true, data: key ? { [key]: result } : result });
    } catch (error) {
      next(error);
    }
  };
}

export const adminLogin = action((req) => loginAdmin(req.body || {}));
export const adminMe = action((req) => getCurrentAdmin(req.admin.id), { key: 'admin' });
export const adminChangePassword = action((req) => changeAdminPassword(req.admin.id, req.body || {}));

export const adminAccountList = action((req) => listAdminAccounts(req.query));
export const adminAccountDetail = action((req) => getAdminAccount(req.params.adminId), { key: 'admin' });
export const adminAccountCreate = action((req) => createAdminAccount(req.body || {}), { status: 201, key: 'admin' });
export const adminAccountUpdate = action((req) => updateAdminAccount(req.admin.id, req.params.adminId, req.body || {}), { key: 'admin' });
export const adminAccountResetPassword = action((req) => resetAdminPassword(req.admin.id, req.params.adminId, req.body || {}));
export const adminAccountDelete = action((req) => deleteAdminAccount(req.admin.id, req.params.adminId));

export const adminBrandList = action((req) => listBrands(req.query));
export const adminBrandDetail = action((req) => getBrand(req.params.brandId), { key: 'brand' });
export const adminBrandCreate = action((req) => createBrand(req.body || {}), { status: 201, key: 'brand' });
export const adminBrandUpdate = action((req) => updateBrand(req.params.brandId, req.body || {}), { key: 'brand' });
export const adminBrandDelete = action((req) => deleteBrand(req.params.brandId));
export const adminBrandLogoUpload = action((req) => uploadBrandLogo(req.params.brandId, req.file), { key: 'brand' });
export const adminBrandLogoDelete = action((req) => removeBrandLogo(req.params.brandId), { key: 'brand' });

export const adminCategoryList = action((req) => listCategories(req.query));
export const adminCategoryDetail = action((req) => getCategory(req.params.categoryId), { key: 'category' });
export const adminCategoryCreate = action((req) => createCategory(req.body || {}), { status: 201, key: 'category' });
export const adminCategoryUpdate = action((req) => updateCategory(req.params.categoryId, req.body || {}), { key: 'category' });
export const adminCategoryDelete = action((req) => deleteCategory(req.params.categoryId));

export const adminCatalogMeta = action(() => getAdminCatalogMeta());
export const adminProductList = action((req) => listProducts(req.query));
export const adminProductDetail = action((req) => getProduct(req.params.productId), { key: 'product' });
export const adminProductCreate = action((req) => createProduct(req.body || {}), { status: 201, key: 'product' });
export const adminProductUpdate = action((req) => updateProduct(req.params.productId, req.body || {}), { key: 'product' });
export const adminProductDelete = action((req) => deleteProduct(req.params.productId));

export const adminColorwayDetail = action((req) => getColorway(req.params.colorwayId), { key: 'colorway' });
export const adminColorwayCreate = action((req) => createColorway(req.params.productId, req.body || {}), { status: 201, key: 'colorway' });
export const adminColorwayUpdate = action((req) => updateColorway(req.params.colorwayId, req.body || {}), { key: 'colorway' });
export const adminColorwaySetDefault = action((req) => setDefaultColorway(req.params.colorwayId));
export const adminColorwayDelete = action((req) => deleteColorway(req.params.colorwayId));

export const adminImageUpload = action((req) => uploadColorwayImage(req.params.colorwayId, req.body || {}, req.file), { status: 201, key: 'image' });
export const adminImageOrder = action((req) => reorderColorwayImages(req.params.colorwayId, req.body || {}), { key: 'images' });
export const adminImageDelete = action((req) => deleteProductImage(req.params.imageId));

export const adminVariantCreate = action((req) => createVariant(req.params.colorwayId, req.body || {}), { status: 201, key: 'variant' });
export const adminVariantUpdate = action((req) => updateVariant(req.params.variantId, req.body || {}), { key: 'variant' });
export const adminVariantStock = action((req) => updateVariantStock(req.params.variantId, req.body || {}), { key: 'variant' });
export const adminVariantDelete = action((req) => deleteVariant(req.params.variantId));

export const adminOrderList = action((req) => listAdminOrders(req.query));
export const adminOrderDetail = action((req) => getAdminOrder(req.params.orderCode), { key: 'order' });
export const adminOrderStatusUpdate = action((req) => updateAdminOrderStatus(req.params.orderCode, req.body || {}), { key: 'order' });

export const adminCustomerList = action((req) => listAdminCustomers(req.query));
export const adminCustomerDetail = action((req) => getAdminCustomer(req.params.customerId));
export const adminCustomerOrderList = action((req) => listAdminCustomerOrders(req.params.customerId, req.query));

export const adminReviewList = action((req) => listAdminReviews(req.query));
export const adminReviewDetail = action((req) => getAdminReview(req.params.reviewId), { key: 'review' });
export const adminReviewDelete = action((req) => deleteAdminReview(req.params.reviewId));

export const adminDashboardSummary = action(() => getAdminDashboardSummary());
export const adminDashboardRevenue = action((req) => getAdminRevenueChart(req.query));
