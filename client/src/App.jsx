import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderLookupPage from './pages/OrderLookupPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AccountPage from './pages/AccountPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import MemberOrdersPage from './pages/MemberOrdersPage';
import MemberOrderDetailPage from './pages/MemberOrderDetailPage';
import RequireMember from './components/auth/RequireMember';
import { AuthProvider } from './context/AuthContext';

/**
 * ScrollToTop Component
 * Ensures page scrolls to top on pathname changes (e.g. /products -> /products/:slug).
 * Preserves hash anchors (e.g. /#brands) and avoids re-scrolling on query-only changes (?colorway=).
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (!window.location.hash) {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-[#f8f8f6] text-[#121212] overflow-x-hidden">
          {/* Top Header */}
          <Header />

          {/* Routed Content Area */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success/:orderCode" element={<OrderSuccessPage />} />
              <Route path="/order-lookup" element={<OrderLookupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/account"
                element={(
                  <RequireMember>
                    <AccountPage />
                  </RequireMember>
                )}
              />
              <Route
                path="/account/change-password"
                element={(
                  <RequireMember>
                    <ChangePasswordPage />
                  </RequireMember>
                )}
              />
              <Route
                path="/account/orders"
                element={(
                  <RequireMember>
                    <MemberOrdersPage />
                  </RequireMember>
                )}
              />
              <Route
                path="/account/orders/:orderCode"
                element={(
                  <RequireMember>
                    <MemberOrderDetailPage />
                  </RequireMember>
                )}
              />
            </Routes>
          </main>

          {/* Storefront Footer */}
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
