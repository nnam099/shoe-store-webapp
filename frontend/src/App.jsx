import { Route, Routes } from "react-router";

import { ChangePasswordPage } from "./pages/account/ChangePasswordPage.jsx";
import { ProfilePage } from "./pages/account/ProfilePage.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { AdminHomePage } from "./pages/admin/AdminHomePage.jsx";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage.jsx";
import { AdminCatalogPage } from "./pages/admin/AdminCatalogPage.jsx";
import { AdminProductCreatePage } from "./pages/admin/AdminProductCreatePage.jsx";
import { AdminProductEditPage } from "./pages/admin/AdminProductEditPage.jsx";
import { AdminProductListPage } from "./pages/admin/AdminProductListPage.jsx";
import { AdminLayout } from "./components/admin/AdminLayout.jsx";
import { StorefrontLayout } from "./components/storefront/StorefrontLayout.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { CartPage } from "./pages/cart/CartPage.jsx";
import { ProductListPage } from "./pages/products/ProductListPage.jsx";
import { ProductDetailPage } from "./pages/products/ProductDetailPage.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";

export function App() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/san-pham" element={<ProductListPage />} />
        <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
        <Route path="/gio-hang" element={<CartPage />} />
      </Route>
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route path="/admin/dang-nhap" element={<AdminLoginPage />} />
      <Route element={<ProtectedRoute allowedRole="customer" loginPath="/dang-nhap" />}>
        <Route path="/tai-khoan" element={<ProfilePage />} />
        <Route path="/tai-khoan/doi-mat-khau" element={<ChangePasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRole="admin" loginPath="/admin/dang-nhap" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/danh-muc" element={<AdminCatalogPage />} />
          <Route path="/admin/san-pham" element={<AdminProductListPage />} />
          <Route path="/admin/san-pham/them" element={<AdminProductCreatePage />} />
          <Route path="/admin/san-pham/:productId" element={<AdminProductEditPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
