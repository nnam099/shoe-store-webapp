import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { useAuth } from "../../auth/useAuth.js";
import { AuthLayout } from "../../components/auth/AuthLayout.jsx";
import { FormField } from "../../components/forms/FormField.jsx";
import { PasswordField } from "../../components/forms/PasswordField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

export function LoginPage() {
  useDocumentTitle("Đăng nhập");
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
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
      const result = await auth.loginCustomer({ identifier, password });
      navigate(location.state?.from ?? "/tai-khoan", {
        replace: true,
        state: { mergeMessage: result.mergeMessage, mergeError: result.mergeError },
      });
    } catch (requestError) {
      setError(requestError.message);
      setFields(requestError.fields ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Tài khoản Customer"
      title="Đăng nhập"
      description="Dùng email hoặc số điện thoại đã đăng ký."
      footer={
        <p>
          Chưa có tài khoản?{" "}
          <Link className="font-semibold text-cobalt hover:underline" to="/dang-ky">
            Đăng ký
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {location.state?.message ? <p role="status" className="rounded-lg bg-mint/15 p-3 text-sm text-emerald-800">{location.state.message}</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
        <FormField label="Email hoặc số điện thoại" name="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} error={fields.identifier} autoComplete="username" />
        <PasswordField label="Mật khẩu" name="password" value={password} onChange={(event) => setPassword(event.target.value)} error={fields.password} />
        <button className="mt-2 min-h-11 rounded-lg bg-cobalt px-4 font-bold text-white transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </AuthLayout>
  );
}
