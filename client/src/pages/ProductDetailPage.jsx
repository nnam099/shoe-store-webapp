import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getProductBySlug, getColorwayBySlug } from '../services/catalogService';
import { formatPrice } from '../config/site';
import { addToCart } from '../utils/cartStorage';
import ProductGallery from '../components/product-detail/ProductGallery';
import ColorwaySelector from '../components/product-detail/ColorwaySelector';
import SizeSelector from '../components/product-detail/SizeSelector';
import QuantitySelector from '../components/product-detail/QuantitySelector';
import SizeGuideModal from '../components/product-detail/SizeGuideModal';
import ProductNotFound from '../components/product-detail/ProductNotFound';

/**
 * ProductDetailPage Component
 * Detailed view of a single product with full gallery, colorway deep linking,
 * deterministic stock variants, resilient localStorage cart addition, and
 * neutral factual product specifications.
 */
function ProductDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query product data
  const product = useMemo(() => getProductBySlug(slug), [slug]);

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

  // If product not found, render 404
  if (!product || !activeColorway) {
    return <ProductNotFound />;
  }

  // Selected variant derivation
  const selectedVariant = selectedSize
    ? activeColorway.variants.find((v) => v.size === selectedSize)
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
        brandName: product.brand.name,
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
            to={`/products?brand=${product.brand.slug}`}
            className="hover:text-[#121212] transition-colors"
          >
            {product.brand.name}
          </Link>
          <span>/</span>
          <span className="text-[#121212]">{product.name}</span>
        </nav>

        {/* Main 2-Column Product Layout (Desktop: Gallery Left 58%, Purchase Panel Right 42%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Product Gallery */}
          <div className="lg:col-span-7">
            <ProductGallery
              images={activeColorway.images}
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
                  to={`/products?brand=${product.brand.slug}`}
                  className="text-xs font-extrabold uppercase tracking-widest text-[#737373] hover:text-[#121212] transition-colors"
                >
                  {product.brand.name}
                </Link>
                <span className="text-[#d4d4cb]">•</span>
                <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                  {product.categories.join(' / ')}
                </span>
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
              colorways={product.colorways}
              selectedColorwaySlug={activeColorway.slug}
              onSelectColorway={handleSelectColorway}
            />

            {/* Size Selector */}
            <SizeSelector
              variants={activeColorway.variants}
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
                {product.name} là mẫu giày của {product.brand.name} trong danh mục{' '}
                {product.categories.join(' / ')} tại STEP/LAB.
              </p>

              {/* Factual Spec Sheet */}
              <div className="bg-white border border-[#e5e5e0] p-4 rounded-xs text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-[#f5f5f3]">
                  <span className="text-[#737373]">Thương hiệu:</span>
                  <span className="font-semibold text-[#121212]">{product.brand.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f5f5f3]">
                  <span className="text-[#737373]">Danh mục:</span>
                  <span className="font-semibold text-[#121212] capitalize">
                    {product.categories.join(', ')}
                  </span>
                </div>
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

            {/* Reviews Section: Neutral Deferred State */}
            <div className="border-t border-[#e5e5e0] pt-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#121212] mb-3">
                Đánh giá sản phẩm
              </h2>
              <div className="p-4 bg-white border border-[#e5e5e0] rounded-xs text-xs text-[#737373] leading-relaxed">
                Đánh giá sản phẩm sẽ được hiển thị khi dữ liệu tài khoản, đơn hàng và đánh giá được kết nối.
              </div>
            </div>
          </div>
        </div>
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
