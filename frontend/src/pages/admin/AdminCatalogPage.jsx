import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { adminCatalogApi } from "../../api/admin-catalog.api.js";
import { useAuth } from "../../auth/useAuth.js";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog.jsx";
import { Pagination } from "../../components/admin/Pagination.jsx";
import { FormField } from "../../components/forms/FormField.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const resources = [
  { value: "categories", label: "Loại giày", singular: "loại giày" },
  { value: "brands", label: "Thương hiệu", singular: "thương hiệu" },
  { value: "sizes", label: "Size", singular: "size" },
  { value: "colors", label: "Màu sắc", singular: "màu" },
];

function readQuery(searchParams) {
  const requestedResource = searchParams.get("resource");
  return {
    resource: resources.some((item) => item.value === requestedResource) ? requestedResource : "categories",
    q: searchParams.get("q") ?? "",
    sort: searchParams.get("sort") ?? "name_asc",
    page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  };
}

export function AdminCatalogPage() {
  useDocumentTitle("Danh mục và thuộc tính");
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readQuery(searchParams);
  const activeResource = resources.find((item) => item.value === query.resource);
  const [result, setResult] = useState({ items: [], pagination: { page: 1, totalPages: 0 } });
  const queryKey = `${query.resource}:${query.q}:${query.sort}:${query.page}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ id: null, name: "", hexCode: "" });
  const [fields, setFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loading = loadedKey !== queryKey;

  async function refresh() {
    setLoadedKey(null);
    setError(null);
    try {
      setResult(await adminCatalogApi.list(token, query.resource, {
        q: query.q,
        sort: query.sort,
        page: query.page,
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadedKey(queryKey);
    }
  }

  useEffect(() => {
    let active = true;
    adminCatalogApi
      .list(token, query.resource, { q: query.q, sort: query.sort, page: query.page })
      .then((response) => {
        if (active) {
          setResult(response);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoadedKey(queryKey);
      });
    return () => {
      active = false;
    };
  }, [token, query.resource, query.q, query.sort, query.page, queryKey]);

  function updateQuery(changes) {
    const next = { ...query, ...changes };
    const parameters = new URLSearchParams();
    parameters.set("resource", next.resource);
    if (next.q) parameters.set("q", next.q);
    if (next.sort !== "name_asc") parameters.set("sort", next.sort);
    if (next.page > 1) parameters.set("page", String(next.page));
    setSearchParams(parameters);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFields({});
    const input = {
      name: form.name,
      ...(query.resource === "colors" ? { hexCode: form.hexCode || null } : {}),
    };
    try {
      if (form.id) await adminCatalogApi.update(token, query.resource, form.id, input);
      else await adminCatalogApi.create(token, query.resource, input);
      setSuccess(form.id ? "Đã cập nhật thành công." : "Đã thêm thành công.");
      setForm({ id: null, name: "", hexCode: "" });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
      setFields(requestError.fields ?? {});
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setSaving(true);
    setError(null);
    try {
      await adminCatalogApi.remove(token, query.resource, deleting.id);
      setDeleting(null);
      setSuccess("Đã xóa thành công.");
      await refresh();
    } catch (requestError) {
      setDeleting(null);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Sản phẩm</p>
      <h1 className="mt-2 font-display text-3xl font-black">Danh mục & thuộc tính</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Nhóm dữ liệu">
        {resources.map((resource) => (
          <button key={resource.value} role="tab" aria-selected={query.resource === resource.value} className={`min-h-10 shrink-0 rounded-lg px-4 font-semibold ${query.resource === resource.value ? "bg-cobalt text-white" : "border border-slate-300 bg-white/70"}`} onClick={() => { setForm({ id: null, name: "", hexCode: "" }); updateQuery({ resource: resource.value, q: "", page: 1 }); }}>
            {resource.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-coral/10 p-3 text-coral">{error}</p> : null}
      {success ? <p role="status" className="mt-4 rounded-lg bg-mint/15 p-3 text-emerald-800">{success}</p> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 rounded-xl border border-white/60 bg-white/70 p-5 backdrop-blur">
          <form className="flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); updateQuery({ q: event.currentTarget.elements.q.value.trim(), page: 1 }); }}>
            <input className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" name="q" defaultValue={query.q} placeholder={`Tìm ${activeResource.singular}`} aria-label="Từ khóa tìm kiếm" />
            <select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" value={query.sort} aria-label="Sắp xếp" onChange={(event) => updateQuery({ sort: event.target.value, page: 1 })}>
              <option value="name_asc">Tên A–Z</option><option value="name_desc">Tên Z–A</option><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option>
            </select>
            <button className="min-h-11 rounded-lg bg-slate-950 px-4 font-bold text-white">Tìm</button>
          </form>
          {loading ? <p role="status" className="py-10 text-center">Đang tải dữ liệu...</p> : result.items.length === 0 ? <p className="py-10 text-center text-slate-500">Chưa có dữ liệu phù hợp.</p> : (
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="p-3">Tên/giá trị</th>{query.resource === "colors" ? <th className="p-3">Mã màu</th> : null}<th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{item.name}</td>{query.resource === "colors" ? <td className="p-3">{item.hexCode ?? "—"}</td> : null}<td className="p-3 text-right"><button type="button" className="mr-2 rounded-md px-3 py-2 font-semibold text-cobalt" onClick={() => setForm({ id: item.id, name: item.name, hexCode: item.hexCode ?? "" })}>Sửa</button><button type="button" className="rounded-md px-3 py-2 font-semibold text-coral" onClick={() => setDeleting(item)}>Xóa</button></td></tr>)}</tbody></table></div>
          )}
          <Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPageChange={(page) => updateQuery({ page })} />
        </div>
        <form className="h-fit rounded-xl border border-white/60 bg-white/75 p-5 backdrop-blur" onSubmit={submit}>
          <h2 className="font-display text-xl font-black">{form.id ? `Sửa ${activeResource.singular}` : `Thêm ${activeResource.singular}`}</h2>
          <div className="mt-5 grid gap-4">
            <FormField label="Tên/giá trị" name="name" value={form.name} error={fields.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            {query.resource === "colors" ? <FormField label="Mã màu (tùy chọn)" name="hexCode" value={form.hexCode} error={fields.hexCode} placeholder="#2454D6" onChange={(event) => setForm((current) => ({ ...current, hexCode: event.target.value }))} /> : null}
            <div className="flex gap-3"><button className="min-h-11 rounded-lg bg-cobalt px-4 font-bold text-white disabled:opacity-60" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>{form.id ? <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold" onClick={() => setForm({ id: null, name: "", hexCode: "" })}>Hủy sửa</button> : null}</div>
          </div>
        </form>
      </div>
      <ConfirmDialog open={Boolean(deleting)} title={`Xóa ${activeResource.singular}?`} description={deleting ? `Bạn sắp xóa “${deleting.name}”. Thao tác chỉ thành công nếu chưa có sản phẩm sử dụng.` : ""} busy={saving} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </section>
  );
}
