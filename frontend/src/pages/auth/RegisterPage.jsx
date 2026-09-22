import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { authApi } from "../../api/auth.api.js";
import { AuthLayout } from "../../components/auth/AuthLayout.jsx";
import { FormField } from "../../components/forms/FormField.jsx";
import { PasswordField } from "../../components/forms/PasswordField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirmation: "",
};

export function RegisterPage() {
  useDocumentTitle("Đăng ký");
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      await authApi.register(form);
      navigate("/dang-nhap", {
        replace: true,
        state: { message: "Đăng ký thành công. Vui lòng đăng nhập." },
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
      title="Tạo tài khoản"
      description="Đăng ký để lưu giỏ hàng, thông tin nhận hàng và theo dõi đơn của bạn."
      footer={
        <p>
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-cobalt hover:underline" to="/dang-nhap">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {error ? <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
        <FormField label="Họ và tên" name="fullName" value={form.fullName} onChange={updateField} error={fields.fullName} autoComplete="name" />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={updateField} error={fields.email} autoComplete="email" />
        <FormField label="Số điện thoại" name="phone" inputMode="numeric" value={form.phone} onChange={updateField} error={fields.phone} autoComplete="tel" />
        <PasswordField label="Mật khẩu" name="password" value={form.password} onChange={updateField} error={fields.password} autoComplete="new-password" />
        <PasswordField label="Xác nhận mật khẩu" name="passwordConfirmation" value={form.passwordConfirmation} onChange={updateField} error={fields.passwordConfirmation} autoComplete="new-password" />
        <button className="mt-2 min-h-11 rounded-lg bg-cobalt px-4 font-bold text-white transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
          {submitting ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>
    </AuthLayout>
  );
}
