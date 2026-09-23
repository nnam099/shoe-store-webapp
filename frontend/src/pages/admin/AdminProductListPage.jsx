import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { adminProductsApi } from "../../api/admin-products.api.js";
import { resolveApiAssetUrl } from "../../api/http.js";
import { useAuth } from "../../auth/useAuth.js";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog.jsx";
import { Pagination } from "../../components/admin/Pagination.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const badgeLabels = { new: "Mới", bestseller: "Bán chạy", featured: "Nổi bật" };

function readQuery(parameters) {
  return { q: parameters.get("q") ?? "", categoryId: parameters.get("categoryId") ?? "", brandId: parameters.get("brandId") ?? "", sort: parameters.get("sort") ?? "newest", page: Number.parseInt(parameters.get("page") ?? "1", 10) || 1 };
}

export function AdminProductListPage() {
  useDocumentTitle("Quản lý sản phẩm");
  const { token } = useAuth();
  const [parameters, setParameters] = useSearchParams();
  const query = readQuery(parameters);
  const queryKey = JSON.stringify(query);
  const [result, setResult] = useState({ items: [], pagination: { page: 1, totalPages: 0 } });
  const [options, setOptions] = useState({ categories: [], brands: [], sizes: [], colors: [] });
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminProductsApi.list(token, {
        q: query.q,
        categoryId: query.categoryId,
        brandId: query.brandId,
        sort: query.sort,
        page: query.page,
      }),
      adminProductsApi.options(token),
    ])
      .then(([products, productOptions]) => { if (active) { setResult(products); setOptions(productOptions); setError(null); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadedKey(queryKey); });
    return () => { active = false; };
  }, [token, query.q, query.categoryId, query.brandId, query.sort, query.page, queryKey]);

  function updateQuery(changes) {
    const next = { ...query, ...changes };
    const value = new URLSearchParams();
    if (next.q) value.set("q", next.q); if (next.categoryId) value.set("categoryId", next.categoryId); if (next.brandId) value.set("brandId", next.brandId); if (next.sort !== "newest") value.set("sort", next.sort); if (next.page > 1) value.set("page", String(next.page));
    setParameters(value);
  }

  async function removeProduct() {
    setBusy(true); setError(null);
    try { await adminProductsApi.remove(token, deleting.id); setDeleting(null); setSuccess("Đã xóa mềm sản phẩm."); setResult((current) => ({ ...current, items: current.items.filter((item) => item.id !== deleting.id) })); }
    catch (requestError) { setDeleting(null); setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Sản phẩm</p><h1 className="mt-2 font-display text-3xl font-black">Quản lý sản phẩm</h1></div><Link className="grid min-h-11 place-items-center rounded-lg bg-cobalt px-5 font-bold text-white" to="/admin/san-pham/them">Thêm sản phẩm</Link></div>{error ? <p role="alert" className="mt-5 rounded-lg bg-coral/10 p-3 text-coral">{error}</p> : null}{success ? <p role="status" className="mt-5 rounded-lg bg-mint/15 p-3 text-emerald-800">{success}</p> : null}<form className="mt-6 grid gap-3 rounded-xl border border-white/60 bg-white/70 p-4 md:grid-cols-5" onSubmit={(event) => { event.preventDefault(); updateQuery({ q: event.currentTarget.elements.q.value.trim(), page: 1 }); }}><input className="min-h-11 rounded-lg border border-slate-300 px-3 md:col-span-2" name="q" defaultValue={query.q} placeholder="Tìm tên sản phẩm" aria-label="Tìm tên sản phẩm"/><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" value={query.categoryId} aria-label="Lọc loại giày" onChange={(event) => updateQuery({ categoryId: event.target.value, page: 1 })}><option value="">Mọi loại</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" value={query.brandId} aria-label="Lọc thương hiệu" onChange={(event) => updateQuery({ brandId: event.target.value, page: 1 })}><option value="">Mọi thương hiệu</option>{options.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="min-h-11 rounded-lg bg-slate-950 px-4 font-bold text-white">Tìm</button><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 md:col-start-5" value={query.sort} aria-label="Sắp xếp sản phẩm" onChange={(event) => updateQuery({ sort: event.target.value, page: 1 })}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="name_asc">Tên A–Z</option><option value="name_desc">Tên Z–A</option><option value="price_asc">Giá tăng</option><option value="price_desc">Giá giảm</option></select></form>{loadedKey !== queryKey ? <p role="status" className="py-12 text-center">Đang tải sản phẩm...</p> : result.items.length === 0 ? <p className="py-12 text-center text-slate-500">Không có sản phẩm phù hợp.</p> : <div className="mt-5 overflow-x-auto rounded-xl border border-white/60 bg-white/75"><table className="w-full min-w-[58rem] text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="p-3">Sản phẩm</th><th className="p-3">Loại / thương hiệu</th><th className="p-3">Giá</th><th className="p-3">Tồn kho</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{result.items.map((product) => <tr key={product.id} className="border-b border-slate-100"><td className="p-3"><div className="flex items-center gap-3">{product.mainImage ? <img className="h-14 w-14 rounded-lg object-cover" src={resolveApiAssetUrl(product.mainImage)} alt="" /> : null}<div><p className="font-bold">{product.name}</p>{product.badgeLabel ? <span className="text-xs text-coral">{badgeLabels[product.badgeLabel]}</span> : null}</div></div></td><td className="p-3">{product.category.name}<br/><span className="text-slate-500">{product.brand.name}</span></td><td className="p-3 font-semibold">{money.format(product.effectivePrice)}</td><td className="p-3"><span className={product.inStock ? "text-emerald-700" : "text-slate-500"}>{product.inStock ? `Còn hàng (${product.totalStock})` : "Hết hàng"}</span></td><td className="p-3 text-right"><Link className="mr-2 rounded px-3 py-2 font-semibold text-cobalt" to={`/admin/san-pham/${product.id}`}>Sửa</Link><button type="button" className="rounded px-3 py-2 font-semibold text-coral" onClick={() => setDeleting(product)}>Xóa</button></td></tr>)}</tbody></table></div>}<Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPageChange={(page) => updateQuery({ page })}/><ConfirmDialog open={Boolean(deleting)} title="Xóa mềm sản phẩm?" description={deleting ? `“${deleting.name}” sẽ không còn hiển thị để bán. Dữ liệu đơn cũ và file ảnh vẫn được giữ.` : ""} busy={busy} onCancel={() => setDeleting(null)} onConfirm={removeProduct}/></section>;
}
