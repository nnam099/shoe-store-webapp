import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../../auth/useAuth.js";
import { AuthLayout } from "../../components/auth/AuthLayout.jsx";
import { FormField } from "../../components/forms/FormField.jsx";
import { PasswordField } from "../../components/forms/PasswordField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

export function AdminLoginPage() {
  useDocumentTitle("Đăng nhập quản trị");
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      await loginAdmin({ email, password });
      navigate("/admin", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setFields(requestError.fields ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Khu vực Admin"
      title="Đăng nhập quản trị"
      description="Trang đăng nhập riêng dành cho tài khoản quản trị SẢI."
      footer={<Link className="font-semibold text-cobalt hover:underline" to="/">Về trang chủ</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {error ? <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
        <FormField label="Email quản trị" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={fields.email} autoComplete="username" />
        <PasswordField label="Mật khẩu" name="password" value={password} onChange={(event) => setPassword(event.target.value)} error={fields.password} />
        <button className="mt-2 min-h-11 rounded-lg bg-cobalt px-4 font-bold text-white hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập quản trị"}
        </button>
      </form>
    </AuthLayout>
  );
}
