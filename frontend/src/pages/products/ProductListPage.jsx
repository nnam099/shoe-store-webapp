import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { productsApi } from "../../api/products.api.js";
import { ProductCard } from "../../components/products/ProductCard.jsx";
import { ProductFilterSidebar } from "../../components/products/ProductFilterSidebar.jsx";
import { ProductPagination } from "../../components/products/ProductPagination.jsx";
import { ProductSortBar } from "../../components/products/ProductSortBar.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

function readQuery(parameters) {
  return {
    q: parameters.get("q") ?? "",
    brandIds: parameters.getAll("brandId"),
    categoryIds: parameters.getAll("categoryId"),
    sizeIds: parameters.getAll("sizeId"),
    colorIds: parameters.getAll("colorId"),
    minPrice: parameters.get("minPrice") ?? "",
    maxPrice: parameters.get("maxPrice") ?? "",
    sort: ["newest", "price_asc", "price_desc", "name_asc"].includes(parameters.get("sort")) ? parameters.get("sort") : "newest",
    page: Number.parseInt(parameters.get("page") ?? "1", 10) || 1,
  };
}

function toParameters(query) {
  const parameters = new URLSearchParams();
  if (query.q.trim()) parameters.set("q", query.q.trim());
  for (const [key, values] of [
    ["brandId", query.brandIds], ["categoryId", query.categoryIds], ["sizeId", query.sizeIds], ["colorId", query.colorIds],
  ]) values.forEach((value) => parameters.append(key, value));
  if (query.minPrice !== "") parameters.set("minPrice", query.minPrice);
  if (query.maxPrice !== "") parameters.set("maxPrice", query.maxPrice);
  if (query.sort !== "newest") parameters.set("sort", query.sort);
  if (query.page > 1) parameters.set("page", String(query.page));
  return parameters;
}

const emptyOptions = { brands: [], categories: [], sizes: [], colors: [] };
const emptyResult = { products: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } };

export function ProductListPage() {
  useDocumentTitle("Sản phẩm");
  const [parameters, setParameters] = useSearchParams();
  const parameterKey = parameters.toString();
  const query = readQuery(parameters);
  const [draftState, setDraftState] = useState({ key: parameterKey, value: query });
  const draft = draftState.key === parameterKey ? draftState.value : query;
  const [result, setResult] = useState(emptyResult);
  const [options, setOptions] = useState(emptyOptions);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [optionsError, setOptionsError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${parameterKey}:${reloadKey}`;
  const loading = loadedKey !== requestKey;

  const setDraft = (action) => {
    setDraftState((current) => {
      const value = current.key === parameterKey ? current.value : query;
      return {
        key: parameterKey,
        value: typeof action === "function" ? action(value) : action,
      };
    });
  };

  useEffect(() => {
    let active = true;
    productsApi.options()
      .then((value) => { if (active) { setOptions(value); setOptionsError(null); } })
      .catch(() => { if (active) setOptionsError("Không thể tải các lựa chọn bộ lọc."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const requestQuery = readQuery(new URLSearchParams(parameterKey));
    productsApi.list(requestQuery)
      .then((value) => {
        if (active) {
          setResult(value);
          setError(null);
          setLoadedKey(requestKey);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
          setLoadedKey(requestKey);
        }
      });
    return () => { active = false; };
  }, [parameterKey, reloadKey, requestKey]);

  const navigateWith = (next) => setParameters(toParameters(next));

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cobalt">Danh mục</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">Chọn đôi giày đúng chất</h1>
        <p className="mt-3 text-muted">Lọc theo phong cách, size và màu đang còn hàng.</p>
      </div>
      <div className="grid gap-7 md:grid-cols-[17rem_minmax(0,1fr)]">
        <ProductFilterSidebar
          draft={draft}
          setDraft={setDraft}
          options={options}
          onApply={() => navigateWith({ ...draft, page: 1 })}
          onClear={() => {
            const cleared = readQuery(new URLSearchParams());
            setDraft(cleared);
            navigateWith(cleared);
          }}
        />
        <div>
          {optionsError ? <p role="alert" className="mb-4 rounded-lg bg-coral/10 p-3 text-sm text-coral">{optionsError}</p> : null}
          <ProductSortBar totalItems={result.pagination.totalItems} sort={query.sort} onSortChange={(sort) => navigateWith({ ...query, sort, page: 1 })} />
          {loading ? (
            <p role="status" className="rounded-xl border border-line bg-white/60 py-16 text-center text-muted">Đang tải sản phẩm...</p>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-6 text-coral"><p>{error}</p><button type="button" className="mt-3 font-bold underline" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></div>
          ) : result.products.length === 0 ? (
            <div className="rounded-xl border border-line bg-white/60 py-16 text-center"><p className="font-display text-xl font-bold">Không tìm thấy sản phẩm</p><p className="mt-2 text-sm text-muted">Hãy thử xóa bớt bộ lọc hoặc đổi từ khóa.</p></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          )}
          {!loading && !error ? <ProductPagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPageChange={(page) => navigateWith({ ...query, page })} /> : null}
        </div>
      </div>
    </section>
  );
}
