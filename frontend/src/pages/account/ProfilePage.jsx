import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { accountApi } from "../../api/account.api.js";
import { useAuth } from "../../auth/useAuth.js";
import { FormField } from "../../components/forms/FormField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const emptyAddress = { province: "", district: "", ward: "", addressLine: "" };

export function ProfilePage() {
  useDocumentTitle("Tài khoản của tôi");
  const { token, logout, updateAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [useAddress, setUseAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState({});
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    accountApi
      .getProfile(token)
      .then(({ account }) => {
        if (!active) return;
        setForm({
          fullName: account.fullName,
          email: account.email,
          phone: account.phone,
          defaultAddress: account.defaultAddress ?? emptyAddress,
        });
        setUseAddress(Boolean(account.defaultAddress));
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          logout();
          navigate("/dang-nhap", { replace: true });
          return;
        }
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, logout, navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateAddress(event) {
    setForm((current) => ({
      ...current,
      defaultAddress: { ...current.defaultAddress, [event.target.name]: event.target.value },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setFields({});

    try {
      const { account } = await accountApi.updateProfile(token, {
        fullName: form.fullName,
        phone: form.phone,
        defaultAddress: useAddress ? form.defaultAddress : null,
      });
      updateAccount(account);
      setForm({
        fullName: account.fullName,
        email: account.email,
        phone: account.phone,
        defaultAddress: account.defaultAddress ?? emptyAddress,
      });
      setUseAddress(Boolean(account.defaultAddress));
      setSuccess("Đã cập nhật thông tin cá nhân.");
    } catch (requestError) {
      if (requestError.status === 401) {
        logout();
        navigate("/dang-nhap", { replace: true });
        return;
      }
      setError(requestError.message);
      setFields(requestError.fields ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p role="status">Đang tải thông tin tài khoản...</p>;
  }

  return (
    <main className="min-h-screen bg-auth px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl rounded-2xl border border-white/60 bg-white/75 p-6 shadow-xl shadow-cobalt/10 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Customer</p>
            <h1 className="mt-2 font-display text-3xl font-black">Thông tin cá nhân</h1>
          </div>
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold" onClick={() => { logout(); navigate("/dang-nhap", { replace: true }); }}>
            Đăng xuất
          </button>
        </div>
        {location.state?.mergeMessage ? <p role="status" className="mt-5 rounded-lg bg-amber/20 p-3 text-sm">{location.state.mergeMessage}</p> : null}
        {location.state?.mergeError ? <p role="alert" className="mt-5 rounded-lg bg-coral/10 p-3 text-sm text-coral">{location.state.mergeError}</p> : null}
        {error ? <p role="alert" className="mt-5 rounded-lg bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
        {success ? <p role="status" className="mt-5 rounded-lg bg-mint/15 p-3 text-sm text-emerald-800">{success}</p> : null}
        {form ? (
          <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate>
            <FormField label="Họ và tên" name="fullName" value={form.fullName} onChange={updateField} error={fields.fullName} autoComplete="name" />
            <FormField label="Email (không thể thay đổi)" name="email" type="email" value={form.email} disabled />
            <FormField label="Số điện thoại" name="phone" value={form.phone} onChange={updateField} error={fields.phone} autoComplete="tel" />
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={useAddress} onChange={(event) => setUseAddress(event.target.checked)} />
              Lưu địa chỉ nhận hàng mặc định
            </label>
            {useAddress ? (
              <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-2 font-semibold">Địa chỉ mặc định</legend>
                <FormField label="Tỉnh/thành" name="province" value={form.defaultAddress.province} onChange={updateAddress} error={fields["defaultAddress.province"]} />
                <FormField label="Quận/huyện" name="district" value={form.defaultAddress.district} onChange={updateAddress} error={fields["defaultAddress.district"]} />
                <FormField label="Phường/xã" name="ward" value={form.defaultAddress.ward} onChange={updateAddress} error={fields["defaultAddress.ward"]} />
                <FormField label="Địa chỉ chi tiết" name="addressLine" value={form.defaultAddress.addressLine} onChange={updateAddress} error={fields["defaultAddress.addressLine"]} />
              </fieldset>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3">
              <button className="min-h-11 rounded-lg bg-cobalt px-5 font-bold text-white hover:bg-cobalt-deep disabled:opacity-60" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <Link className="grid min-h-11 place-items-center rounded-lg border border-slate-300 px-5 font-semibold" to="/tai-khoan/doi-mat-khau">
                Đổi mật khẩu
              </Link>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
