import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { accountApi } from "../../api/account.api.js";
import { useAuth } from "../../auth/useAuth.js";
import { AuthLayout } from "../../components/auth/AuthLayout.jsx";
import { PasswordField } from "../../components/forms/PasswordField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

export function ChangePasswordPage() {
  useDocumentTitle("Đổi mật khẩu");
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setFields({});

    try {
      const result = await accountApi.changePassword(auth.token, form);
      setSuccess(result.message);
      setForm({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" });
    } catch (requestError) {
      if (requestError.status === 401) {
        auth.logout();
        navigate("/dang-nhap", { replace: true });
        return;
      }
      setError(requestError.message);
      setFields(requestError.fields ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Bảo mật tài khoản"
      title="Đổi mật khẩu"
      description="Token đang dùng vẫn còn hiệu lực sau khi đổi mật khẩu theo phạm vi P1."
      footer={<Link className="font-semibold text-cobalt hover:underline" to="/tai-khoan">Quay lại thông tin cá nhân</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {error ? <p role="alert" className="rounded-lg bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
        {success ? <p role="status" className="rounded-lg bg-mint/15 p-3 text-sm text-emerald-800">{success}</p> : null}
        <PasswordField label="Mật khẩu hiện tại" name="currentPassword" value={form.currentPassword} onChange={updateField} error={fields.currentPassword} />
        <PasswordField label="Mật khẩu mới" name="newPassword" value={form.newPassword} onChange={updateField} error={fields.newPassword} autoComplete="new-password" />
        <PasswordField label="Xác nhận mật khẩu mới" name="newPasswordConfirmation" value={form.newPasswordConfirmation} onChange={updateField} error={fields.newPasswordConfirmation} autoComplete="new-password" />
        <button className="mt-2 min-h-11 rounded-lg bg-cobalt px-4 font-bold text-white hover:bg-cobalt-deep disabled:opacity-60" disabled={submitting}>
          {submitting ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
        </button>
      </form>
    </AuthLayout>
  );
}
