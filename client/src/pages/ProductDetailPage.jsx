import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { fetchCatalogProduct, getColorwayBySlug } from '../services/catalogService';
import { formatPrice } from '../config/site';
import { addToCart } from '../utils/cartStorage';
import ProductGallery from '../components/product-detail/ProductGallery';
import ColorwaySelector from '../components/product-detail/ColorwaySelector';
import SizeSelector from '../components/product-detail/SizeSelector';
import QuantitySelector from '../components/product-detail/QuantitySelector';
import SizeGuideModal from '../components/product-detail/SizeGuideModal';
import ProductNotFound from '../components/product-detail/ProductNotFound';
import ProductReviews from '../components/product-detail/ProductReviews';

/**
 * ProductDetailPage Component
 * Detailed view of a single product with full gallery, colorway deep linking,
 * deterministic stock variants, resilient localStorage cart addition, and
 * neutral factual product specifications.
 * Communicates with backend Catalog API asynchronously.
 */
function ProductDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Async product data state
  const [productState, setProductState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const loadProduct = useCallback(() => {
    if (!slug) return;
    setProductState((prev) => ({ ...prev, loading: true, error: null }));

    fetchCatalogProduct(slug)
      .then((product) => {
        setProductState({
          loading: false,
          data: product,
          error: null,
        });
      })
      .catch((err) => {
        setProductState({
          loading: false,
          data: null,
          error: err,
        });
      });
  }, [slug]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Fetch product when slug changes
    loadProduct();
  }, [loadProduct]);

  const product = productState.data;

  // Read requested colorway slug from URL
  const requestedColorwaySlug = searchParams.get('colorway');

  // Resolve colorway and validity
  const { colorway: activeColorway, isValid: isColorwayValid } = useMemo(() => {
    return getColorwayBySlug(product, requestedColorwaySlug);
  }, [product, requestedColorwaySlug]);

  // Ephemeral UI states
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [addedSuccessMessage, setAddedSuccessMessage] = useState(null);

  const feedbackTimerRef = useRef(null);

  // Clean up feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Canonicalize invalid colorway parameter via replace navigation
  useEffect(() => {
    if (product && requestedColorwaySlug && !isColorwayValid) {
      setSearchParams({}, { replace: true });
    }
  }, [product, requestedColorwaySlug, isColorwayValid, setSearchParams]);

  // Reset ephemeral state when active colorway changes
  const activeColorwaySlug = activeColorway ? activeColorway.slug : null;
  const prevColorwaySlugRef = useRef(activeColorwaySlug);

  useEffect(() => {
    if (prevColorwaySlugRef.current !== activeColorwaySlug) {
      prevColorwaySlugRef.current = activeColorwaySlug;
      setSelectedSize(null);
      setQuantity(1);
      setActiveImageIndex(0);
      setAddedSuccessMessage(null);
    }
  }, [activeColorwaySlug]);

  // If loading product
  if (productState.loading) {
    return (
      <div className="bg-[#f8f8f6] min-h-screen py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-48 bg-[#e5e5e0] mb-6 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-7">
              <div className="aspect-square bg-[#f0f0ed] border border-[#e5e5e0] rounded-xs animate-pulse" />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <div className="border-b border-[#e5e5e0] pb-5 space-y-3">
                <div className="h-3 w-28 bg-[#e5e5e0] animate-pulse" />
                <div className="h-8 w-64 bg-[#e5e5e0] animate-pulse" />
                <div className="h-6 w-36 bg-[#e5e5e0] animate-pulse" />
              </div>
              <div className="h-24 bg-[#f0f0ed] border border-[#e5e5e0] animate-pulse" />
              <div className="h-32 bg-[#f0f0ed] border border-[#e5e5e0] animate-pulse" />
              <div className="h-12 bg-[#121212]/20 rounded-xs animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If product not found (404)
  if (
    productState.error?.status === 404 ||
    productState.error?.code === 'PRODUCT_NOT_FOUND' ||
    (!product && !productState.loading && !productState.error)
  ) {
    return <ProductNotFound />;
  }

  // If network or server error
  if (productState.error) {
    return (
      <div className="bg-[#f8f8f6] min-h-screen py-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="bg-white border border-[#fecaca] p-8 sm:p-12 rounded-xs">
            <div className="w-12 h-12 mx-auto mb-4 text-[#dc2626]">
              <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#121212] mb-1.5">
              Không thể tải thông tin sản phẩm
            </h2>
            <p className="text-xs text-[#737373] mb-6">
              {productState.error.message || 'Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadProduct}
                className="px-6 py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Thử lại
              </button>
              <Link
                to="/products"
                className="px-6 py-2.5 bg-white border border-[#e5e5e0] hover:border-[#121212] text-xs font-bold uppercase tracking-wider text-[#121212] rounded-xs transition-colors"
              >
                Về danh mục
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !activeColorway) {
    return <ProductNotFound />;
  }

  // Selected variant derivation
  const selectedVariant = selectedSize
    ? activeColorway.variants?.find((v) => v.size === selectedSize)
    : null;
  const isOutOfStock = selectedVariant ? selectedVariant.stock === 0 : false;
  const isAddDisabled = !selectedSize || isOutOfStock;

  // Handlers
  const handleSelectColorway = (newColorwaySlug) => {
    if (newColorwaySlug === activeColorway.slug) return;

    // Deliberate user action -> push history
    if (newColorwaySlug === product.defaultColorwaySlug) {
      navigate(`/products/${product.slug}`);
    } else {
      navigate(`/products/${product.slug}?colorway=${newColorwaySlug}`);
    }
  };

  const handleSelectSize = (size) => {
    setSelectedSize(size);
    setQuantity(1);
    setAddedSuccessMessage(null);
  };

  const handleAddToCart = () => {
    if (isAddDisabled || !selectedVariant) return;

    const unitPrice = activeColorway.salePrice ?? activeColorway.price;
    const { addedItem, merged } = addToCart(
      {
        productSlug: product.slug,
        productName: product.name,
        brandName: product.brand?.name || '',
        colorwaySlug: activeColorway.slug,
        colorwayName: activeColorway.name,
        size: selectedSize,
        quantity,
        unitPrice,
        thumbnail: activeColorway.thumbnail,
      },
      selectedVariant.stock
    );

    if (addedItem) {
      const msg = merged
        ? `Đã cập nhật số lượng: ${addedItem.quantity} đôi (EU ${selectedSize})`
        : `Đã thêm ${quantity} đôi (EU ${selectedSize}) vào giỏ hàng`;

      setAddedSuccessMessage(msg);

      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setAddedSuccessMessage(null);
      }, 3500);
    }
  };

  // Pricing calculations
  const hasSale = activeColorway.salePrice != null && activeColorway.salePrice < activeColorway.price;
  const discountPercent = hasSale
    ? Math.round(((activeColorway.price - activeColorway.salePrice) / activeColorway.price) * 100)
    : 0;

  const categoryNamesDisplay = product.categoryNames?.length > 0
    ? product.categoryNames.join(' / ')
    : '';

  return (
    <div className="bg-[#f8f8f6] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav
          className="text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-6 flex flex-wrap items-center gap-1.5 select-none"
          aria-label="Đường dẫn trang"
        >
          <Link to="/" className="hover:text-[#121212] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/products" className="hover:text-[#121212] transition-colors">
            Sản phẩm
          </Link>
          <span>/</span>
          <Link
            to={`/products?brand=${product.brand?.slug}`}
            className="hover:text-[#121212] transition-colors"
          >
            {product.brand?.name}
          </Link>
          <span>/</span>
          <span className="text-[#121212]">{product.name}</span>
        </nav>

        {/* Main 2-Column Product Layout (Desktop: Gallery Left 58%, Purchase Panel Right 42%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Product Gallery */}
          <div className="lg:col-span-7">
            <ProductGallery
              images={activeColorway.images || []}
              productName={product.name}
              colorwayName={activeColorway.name}
              activeImageIndex={activeImageIndex}
              onSelectImage={setActiveImageIndex}
            />
          </div>

          {/* Right Column: Sticky Purchase & Details Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky lg:top-24">
            {/* Title & Brand Header */}
            <div className="border-b border-[#e5e5e0] pb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  to={`/products?brand=${product.brand?.slug}`}
                  className="text-xs font-extrabold uppercase tracking-widest text-[#737373] hover:text-[#121212] transition-colors"
                >
                  {product.brand?.name}
                </Link>
                {categoryNamesDisplay && (
                  <>
                    <span className="text-[#d4d4cb]">•</span>
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                      {categoryNamesDisplay}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#121212]">
                {product.name}
              </h1>

              {/* Price Display */}
              <div className="mt-3 flex items-baseline gap-3">
                {hasSale ? (
                  <>
                    <span className="text-2xl font-extrabold text-[#b91c1c] tracking-tight">
                      {formatPrice(activeColorway.salePrice)}
                    </span>
                    <span className="text-sm font-semibold text-[#a3a3a3] line-through">
                      {formatPrice(activeColorway.price)}
                    </span>
                    <span className="px-2 py-0.5 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[11px] font-extrabold rounded-xs uppercase tracking-wider">
                      -{discountPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold text-[#121212] tracking-tight">
                    {formatPrice(activeColorway.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Colorway Selector */}
            <ColorwaySelector
              colorways={product.colorways || []}
              selectedColorwaySlug={activeColorway.slug}
              onSelectColorway={handleSelectColorway}
            />

            {/* Size Selector */}
            <SizeSelector
              variants={activeColorway.variants || []}
              selectedSize={selectedSize}
              onSelectSize={handleSelectSize}
              onOpenSizeGuide={() => setIsSizeGuideOpen(true)}
            />

            {/* Quantity Selector */}
            <QuantitySelector
              quantity={quantity}
              maxStock={selectedVariant ? selectedVariant.stock : 1}
              disabled={isAddDisabled}
              onChangeQuantity={setQuantity}
            />

            {/* Add to Cart Action Area */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isAddDisabled}
                onClick={handleAddToCart}
                className={`w-full h-12 text-xs font-bold uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-2 select-none ${
                  isAddDisabled
                    ? 'bg-[#e5e5e0] text-[#a3a3a3] cursor-not-allowed border border-[#d4d4cb]'
                    : 'bg-[#121212] hover:bg-[#262626] text-white cursor-pointer shadow-md active:scale-[0.99]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Thêm vào giỏ hàng</span>
              </button>

              {/* Inline Success Feedback with aria-live */}
              {addedSuccessMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-3 p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-xs font-semibold rounded-xs flex items-center gap-2"
                >
                  <svg className="w-4 h-4 shrink-0 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{addedSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Factual Product Information */}
            <div className="border-t border-[#e5e5e0] pt-6 space-y-4">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212]">
                Thông tin sản phẩm
              </h2>

              <p className="text-xs text-[#525252] leading-relaxed">
                {product.name} là mẫu giày của {product.brand?.name}
                {categoryNamesDisplay ? ` trong danh mục ${categoryNamesDisplay}` : ''} tại STEP/LAB.
              </p>

              {/* Factual Spec Sheet */}
              <div className="bg-white border border-[#e5e5e0] p-4 rounded-xs text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-[#f5f5f3]">
                  <span className="text-[#737373]">Thương hiệu:</span>
                  <span className="font-semibold text-[#121212]">{product.brand?.name}</span>
                </div>
                {categoryNamesDisplay && (
                  <div className="flex justify-between py-1 border-b border-[#f5f5f3]">
                    <span className="text-[#737373]">Danh mục:</span>
                    <span className="font-semibold text-[#121212] capitalize">
                      {categoryNamesDisplay}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-[#f5f5f3]">
                  <span className="text-[#737373]">Phối màu:</span>
                  <span className="font-semibold text-[#121212]">{activeColorway.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#737373]">Dải kích cỡ:</span>
                  <span className="font-semibold text-[#121212]">EU 36 – EU 44</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <ProductReviews key={product.slug} productSlug={product.slug} />
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}

export default ProductDetailPage;
