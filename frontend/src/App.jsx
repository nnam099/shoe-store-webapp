import { Route, Routes } from "react-router";

import { ChangePasswordPage } from "./pages/account/ChangePasswordPage.jsx";
import { ProfilePage } from "./pages/account/ProfilePage.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedRole="customer" loginPath="/dang-nhap" />}>
        <Route path="/tai-khoan" element={<ProfilePage />} />
        <Route path="/tai-khoan/doi-mat-khau" element={<ChangePasswordPage />} />
      </Route>
    </Routes>
  );
}
