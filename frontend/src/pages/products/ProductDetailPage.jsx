import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { cartApi } from "../../api/cart.api.js";
import { productsApi } from "../../api/products.api.js";
import { useAuth } from "../../auth/useAuth.js";
import { addGuestCartItem } from "../../cart/guest-cart-storage.js";
import { ProductGallery } from "../../components/products/ProductGallery.jsx";
import { ProductStockBadge } from "../../components/products/ProductStockBadge.jsx";
import { ProductVariantPicker } from "../../components/products/ProductVariantPicker.jsx";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const badgeLabels = { new: "Mới", bestseller: "Bán chạy", featured: "Nổi bật" };

function ProductDetailContent({ product }) {
  const { token, account, status } = useAuth();
  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const selectedVariant = product.variants.find(
    (variant) => variant.color.id === selectedColorId && variant.size.id === selectedSizeId,
  );
  const validQuantity =
    selectedVariant && Number.isInteger(quantity) && quantity >= 1 && quantity <= selectedVariant.stockQuantity;

  function selectColor(colorId) {
    setSelectedColorId(colorId);
    const compatible = product.variants.some(
      (variant) => variant.color.id === colorId && variant.size.id === selectedSizeId && variant.inStock,
    );
    if (!compatible) setSelectedSizeId("");
    setQuantity(1);
    setMessage(null);
    setActionError(null);
  }

  function selectSize(sizeId) {
    setSelectedSizeId(sizeId);
    const compatible = product.variants.some(
      (variant) => variant.size.id === sizeId && variant.color.id === selectedColorId && variant.inStock,
    );
    if (!compatible) setSelectedColorId("");
    setQuantity(1);
    setMessage(null);
    setActionError(null);
  }

  async function addToCart() {
    if (!selectedVariant || !validQuantity || status === "loading" || status === "error") return;
    setBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      if (status === "authenticated" && account?.role === "customer") {
        await cartApi.addItem(token, { productVariantId: selectedVariant.id, quantity });
      } else {
        const result = addGuestCartItem({
          productVariantId: selectedVariant.id,
          quantity,
          stockQuantity: selectedVariant.stockQuantity,
        });
        if (!result.added) {
          setActionError(
            result.reason === "stock_exceeded"
              ? "Tổng số lượng trong giỏ vượt quá tồn kho hiện tại."
              : "Không thể lưu giỏ hàng trên trình duyệt.",
          );
          return;
        }
      }
      globalThis.dispatchEvent(new CustomEvent("sai:cart-updated"));
      setMessage("Đã thêm sản phẩm vào giỏ.");
    } catch (error) {
      setActionError(error.message ?? "Không thể thêm sản phẩm vào giỏ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/san-pham" className="text-sm font-semibold text-cobalt hover:underline">← Quay lại danh sách</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cobalt">{product.brand.name}</p>
            {product.badgeLabel ? <span className="rounded-full bg-coral px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase text-white">{badgeLabels[product.badgeLabel]}</span> : null}
            <ProductStockBadge inStock={product.inStock} />
          </div>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">{product.name}</h1>
          <p className="mt-2 text-sm text-muted">{product.category.name}{product.material ? ` · ${product.material}` : ""}</p>
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-black text-cobalt">{money.format(product.effectivePrice)}</span>
            {product.salePrice !== null ? <span className="text-lg text-slate-400 line-through">{money.format(product.price)}</span> : null}
          </div>
          {product.description ? <p className="mt-6 whitespace-pre-line leading-7 text-slate-700">{product.description}</p> : null}
          <div className="my-7 border-t border-line" />
          <ProductVariantPicker variants={product.variants} selectedColorId={selectedColorId} selectedSizeId={selectedSizeId} onColorChange={selectColor} onSizeChange={selectSize} />
          <div className="mt-6 min-h-6">
            {selectedVariant ? <p role="status" className="text-sm font-semibold text-emerald-800">Còn {selectedVariant.stockQuantity} sản phẩm</p> : <p className="text-sm text-muted">Chọn màu và size để xem tồn kho.</p>}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-slate-700">Số lượng
              <input aria-label="Số lượng" type="number" min="1" max={selectedVariant?.stockQuantity ?? 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} disabled={!selectedVariant} className="mt-2 block min-h-11 w-24 rounded-lg border border-line bg-white px-3 disabled:opacity-50" />
            </label>
            <button type="button" onClick={addToCart} disabled={busy || status === "loading" || status === "error" || !validQuantity} className="min-h-11 flex-1 rounded-lg bg-cobalt px-6 font-bold text-white transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">
              {busy ? "Đang thêm..." : "Thêm vào giỏ"}
            </button>
          </div>
          {message ? <p role="status" className="mt-4 rounded-lg bg-mint/20 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {actionError ? <p role="alert" className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{actionError}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loadedSlug, setLoadedSlug] = useState(null);
  const [error, setError] = useState(null);
  useDocumentTitle(product?.name ?? "Chi tiết sản phẩm");

  useEffect(() => {
    let active = true;
    productsApi.detail(slug)
      .then((result) => {
        if (active) {
          setProduct(result.product);
          setError(null);
          setLoadedSlug(slug);
        }
      })
      .catch((requestError) => {
        if (active) {
          setProduct(null);
          setError(requestError);
          setLoadedSlug(slug);
        }
      });
    return () => { active = false; };
  }, [slug]);

  if (loadedSlug !== slug) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-center text-muted">Đang tải sản phẩm...</p>;
  if (error?.status === 404) return <section className="mx-auto max-w-3xl px-4 py-24 text-center"><p className="font-mono text-sm text-cobalt">404</p><h1 className="mt-2 font-display text-4xl font-black">Không tìm thấy sản phẩm</h1><p className="mt-3 text-muted">Sản phẩm có thể đã ngừng bán hoặc đường dẫn không đúng.</p><Link to="/san-pham" className="mt-6 inline-grid min-h-11 place-items-center rounded-lg bg-cobalt px-5 font-bold text-white">Về danh sách sản phẩm</Link></section>;
  if (error) return <div role="alert" className="mx-auto my-20 max-w-2xl rounded-xl bg-coral/10 p-6 text-center text-coral">{error.message}</div>;
  if (!product) return null;
  return <ProductDetailContent key={product.id} product={product} />;
}
