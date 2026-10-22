import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminPageShell } from '../../components/admin/layout/AdminLayout';
import { StatusBadge, FeaturedBadge } from '../../components/admin/common/AdminBadge';
import ReadinessBanner from '../../components/admin/common/ReadinessBanner';
import ConfirmDeleteModal from '../../components/admin/common/ConfirmDeleteModal';
import ColorwayModal from '../../components/admin/products/ColorwayModal';
import ColorwayImageManager from '../../components/admin/products/ColorwayImageManager';
import VariantModal from '../../components/admin/products/VariantModal';
import VariantStockModal from '../../components/admin/products/VariantStockModal';
import { useAdminAuth } from '../../context/adminContextValue';
import {
  adminGetProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminGetCatalogMeta,
  adminListBrands,
  adminListCategories,
  adminSetDefaultColorway,
  adminDeleteColorway,
  adminDeleteVariant,
} from '../../services/adminService';
import { adminErrorMessage, toSlug, formatVND, formatDate } from '../../utils/adminHelpers';

export default function AdminProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useAdminAuth();

  const [product, setProduct] = useState(null);
  const [meta, setMeta] = useState({ colorFamilies: [] });
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [pageError, setPageError] = useState(null);

  // Selected Colorway Tab
  const [selectedColorwayId, setSelectedColorwayId] = useState(null);

  // Product Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Modal States
  const [colorwayModalOpen, setColorwayModalOpen] = useState(false);
  const [editingColorway, setEditingColorway] = useState(null);

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTargetVariant, setStockTargetVariant] = useState(null);

  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [deleteColorwayTarget, setDeleteColorwayTarget] = useState(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch product, meta, brands and categories from their dedicated endpoints
  const fetchData = useCallback(async () => {
    try {
      setPageError(null);
      const [productData, metaData, brandRes, catRes] = await Promise.all([
        adminGetProduct(token, productId),
        adminGetCatalogMeta(token).catch(() => ({ colorFamilies: [] })),
        adminListBrands(token, { limit: 100, sort: 'name-asc' }).catch(() => ({ items: [] })),
        adminListCategories(token, { limit: 100, sort: 'name-asc' }).catch(() => ({ items: [] })),
      ]);

      const p = productData?.product || productData;
      setProduct(p);
      setMeta(metaData || { colorFamilies: [] });
      setBrandsList(brandRes?.items || []);
      setCategoriesList(catRes?.items || []);

      // Init form fields
      setName(p.name || '');
      setSlug(p.slug || '');
      setBrandId(p.brand?.id ? String(p.brand.id) : (p.brandId ? String(p.brandId) : ''));
      setCategoryIds((p.categories || []).map((c) => c.id));
      setDescription(p.description || '');
      setIsActive(Boolean(p.isActive));
      setIsFeatured(Boolean(p.isFeatured));

      // Select default colorway or first colorway if not selected
      if (p.colorways && p.colorways.length > 0) {
        setSelectedColorwayId((prevId) => {
          if (prevId && p.colorways.some((cw) => cw.id === prevId)) {
            return prevId;
          }
          const def = p.colorways.find((cw) => cw.isDefault);
          return def ? def.id : p.colorways[0].id;
        });
      } else {
        setSelectedColorwayId(null);
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      } else {
        setPageError(adminErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [token, productId, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Save Product
  const handleSaveProduct = async (e, addToast) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Tên sản phẩm không được để trống.');
      return;
    }
    if (!brandId) {
      addToast('error', 'Vui lòng chọn Thương hiệu.');
      return;
    }
    if (!categoryIds || categoryIds.length === 0) {
      addToast('error', 'Vui lòng chọn ít nhất một Danh mục.');
      return;
    }

    setSavingProduct(true);
    try {
      await adminUpdateProduct(token, productId, {
        name: name.trim(),
        slug: slug.trim() || toSlug(name),
        brandId: parseInt(brandId, 10),
        categoryIds: categoryIds.map((id) => parseInt(id, 10)),
        description: description.trim() || null,
        isActive,
        isFeatured,
      });
      addToast('success', 'Cập nhật thông tin sản phẩm thành công!');
      fetchData();
    } catch (err) {
      addToast('error', adminErrorMessage(err));
    } finally {
      setSavingProduct(false);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (addToast) => {
    setActionLoading(true);
    try {
      await adminDeleteProduct(token, productId);
      addToast('success', 'Đã xóa sản phẩm thành công.');
      navigate('/admin/products');
    } catch (err) {
      addToast('error', adminErrorMessage(err));
      setDeleteProductOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Set Default Colorway
  const handleSetDefaultColorway = async (colorwayId, addToast) => {
    setActionLoading(true);
    try {
      await adminSetDefaultColorway(token, colorwayId);
      addToast('success', 'Đã đặt làm phối màu mặc định.');
      fetchData();
    } catch (err) {
      addToast('error', adminErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Colorway
  const handleDeleteColorway = async (addToast) => {
    if (!deleteColorwayTarget) return;
    setActionLoading(true);
    try {
      await adminDeleteColorway(token, deleteColorwayTarget.id);
      addToast('success', `Đã xóa phối màu "${deleteColorwayTarget.name}".`);
      setDeleteColorwayTarget(null);
      fetchData();
    } catch (err) {
      addToast('error', adminErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Variant
  const handleDeleteVariant = async (addToast) => {
    if (!deleteVariantTarget) return;
    setActionLoading(true);
    try {
      await adminDeleteVariant(token, deleteVariantTarget.id);
      addToast('success', `Đã xóa kích cỡ "${deleteVariantTarget.size}".`);
      setDeleteVariantTarget(null);
      fetchData();
    } catch (err) {
      addToast('error', adminErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const selectedColorway = product?.colorways?.find((cw) => cw.id === selectedColorwayId);

  return (
    <AdminPageShell
      title={product ? `Chi tiết: ${product.name}` : 'Chi tiết sản phẩm'}
      breadcrumbs={[
        { label: 'Sản phẩm', to: '/admin/products' },
        { label: product ? product.name : 'Chi tiết' },
      ]}
    >
      {({ addToast }) => {
        if (loading) {
          return (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-[#71717a]">
                <svg className="w-5 h-5 animate-spin text-[#121212]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                </svg>
                Đang tải dữ liệu sản phẩm...
              </div>
            </div>
          );
        }

        if (pageError) {
          return (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <p className="font-semibold mb-1">Không thể tải sản phẩm</p>
              <p>{pageError}</p>
              <button
                onClick={fetchData}
                className="mt-3 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          );
        }

        if (!product) return null;

        return (
          <div className="space-y-6">
            {/* Header info & Readiness banner */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded border border-[#e5e5e0]">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold text-[#121212]">{product.name}</h2>
                    <StatusBadge isActive={product.isActive} />
                    <FeaturedBadge isFeatured={product.isFeatured} />
                  </div>
                  <p className="text-xs text-[#71717a]">
                    Thương hiệu: <strong className="text-[#121212]">{product.brand?.name || '—'}</strong> | Danh mục: <strong className="text-[#121212]">{product.categories?.map((c) => c.name).join(', ') || '—'}</strong> | Tạo lúc: {formatDate(product.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-medium border border-[#e5e5e0] text-[#121212] hover:bg-[#f8f8f6] rounded transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Xem trên Web
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeleteProductOpen(true)}
                    className="px-3 py-2 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded transition-colors"
                  >
                    Xóa sản phẩm
                  </button>
                </div>
              </div>

              {/* Readiness Banner */}
              <ReadinessBanner
                issues={product.readinessIssues || []}
                colorways={product.colorways || []}
              />
            </div>

            {/* Grid 2 columns: General Information & Colorways Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Basic Form (4 columns) */}
              <div className="lg:col-span-4 bg-white p-5 rounded border border-[#e5e5e0] self-start space-y-4">
                <div className="border-b border-[#e5e5e0] pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
                    Thông tin cơ bản
                  </h3>
                  <p className="text-xs text-[#71717a]">
                    Chỉnh sửa thông số cơ bản của sản phẩm.
                  </p>
                </div>

                <form onSubmit={(e) => handleSaveProduct(e, addToast)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                      Đường dẫn (Slug) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                      Thương hiệu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
                    >
                      <option value="">-- Chọn Thương hiệu --</option>
                      {brandsList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {!b.isActive ? '(Ngừng hoạt động)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    {categoriesList.length === 0 ? (
                      <p className="text-xs text-[#71717a]">Đang tải danh mục...</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto border border-[#e5e5e0] p-2 rounded">
                        {categoriesList.map((c) => {
                          const isChecked = categoryIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex cursor-pointer items-center gap-1 border px-2 py-1 text-xs rounded transition-colors ${
                                isChecked
                                  ? 'border-[#121212] bg-[#121212] text-white font-medium'
                                  : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#121212]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => {
                                  setCategoryIds((prev) =>
                                    prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  );
                                }}
                              />
                              {isChecked && (
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {c.name} {!c.isActive ? '(Ngừng)' : ''}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                      Mô tả sản phẩm
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e5e5e0] rounded focus:border-[#121212] focus:outline-none transition-colors"
                      placeholder="Mô tả chất liệu, thiết kế, công nghệ..."
                    />
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-[#e5e5e0] space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-black focus:ring-black accent-[#121212]"
                      />
                      <span className="text-xs font-medium text-[#121212]">
                        Sản phẩm nổi bật (Featured)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-black focus:ring-black accent-[#121212]"
                      />
                      <span className="text-xs font-medium text-[#121212]">
                        Kích hoạt bán (Active)
                      </span>
                    </label>
                    <p className="text-[11px] text-[#71717a] pl-6">
                      Để Active, sản phẩm phải thỏa mãn toàn bộ điều kiện trong danh sách Readiness.
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#121212] hover:bg-black rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingProduct && (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                        </svg>
                      )}
                      Lưu thông tin sản phẩm
                    </button>
                  </div>
                </form>
              </div>

              {/* Colorways and Variants Management (8 columns) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Colorway Tabs / Selector */}
                <div className="bg-white p-5 rounded border border-[#e5e5e0]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e0] pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212]">
                        Phối màu (Colorways) ({product.colorways?.length || 0})
                      </h3>
                      <p className="text-xs text-[#71717a]">
                        Mỗi phối màu quản lý bộ ảnh (tối đa 4 ảnh), giá bán và danh sách kích cỡ riêng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColorway(null);
                        setColorwayModalOpen(true);
                      }}
                      className="px-3 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-black rounded transition-colors flex items-center gap-1.5 self-start"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Thêm Phối màu
                    </button>
                  </div>

                  {/* Colorways list tabs */}
                  {!product.colorways || product.colorways.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[#e5e5e0] rounded">
                      <p className="text-xs text-[#71717a] mb-2">Chưa có phối màu nào.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingColorway(null);
                          setColorwayModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-[#121212] text-white rounded hover:bg-black transition-colors"
                      >
                        Tạo phối màu đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {product.colorways.map((cw) => {
                        const isSelected = cw.id === selectedColorwayId;
                        return (
                          <button
                            key={cw.id}
                            type="button"
                            onClick={() => setSelectedColorwayId(cw.id)}
                            className={`px-3 py-2 rounded text-left border transition-all shrink-0 min-w-[140px] ${
                              isSelected
                                ? 'border-[#121212] bg-[#f8f8f6] ring-1 ring-[#121212]'
                                : 'border-[#e5e5e0] hover:border-[#121212]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-[#121212] truncate max-w-[110px]">
                                {cw.name}
                              </span>
                              {cw.isDefault && (
                                <span className="px-1 py-0.5 text-[9px] font-bold bg-[#121212] text-white rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                              <span>{formatVND(cw.salePrice ?? cw.price)}</span>
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  cw.isActive ? 'bg-green-500' : 'bg-zinc-400'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Colorway Details */}
                  {selectedColorway && (
                    <div className="mt-6 pt-5 border-t border-[#e5e5e0] space-y-6">
                      {/* Colorway Header Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8f8f6] p-4 rounded border border-[#e5e5e0]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-base font-bold text-[#121212]">
                              {selectedColorway.name}
                            </h4>
                            {selectedColorway.isDefault ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#121212] text-white rounded">
                                Mặc định
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleSetDefaultColorway(selectedColorway.id, addToast)}
                                className="px-2 py-0.5 text-[10px] font-semibold border border-[#121212] text-[#121212] hover:bg-[#121212] hover:text-white rounded transition-colors disabled:opacity-50"
                              >
                                Đặt làm mặc định
                              </button>
                            )}
                            <StatusBadge isActive={selectedColorway.isActive} />
                          </div>
                          <div className="text-xs text-[#71717a] flex items-center gap-3 flex-wrap">
                            <span>Slug: <strong className="text-[#121212]">{selectedColorway.slug}</strong></span>
                            <span>Giá niêm yết: <strong className="text-[#121212]">{formatVND(selectedColorway.price)}</strong></span>
                            {selectedColorway.salePrice && (
                              <span>Giá khuyến mãi: <strong className="text-red-600">{formatVND(selectedColorway.salePrice)}</strong></span>
                            )}
                            <span>Họ màu: <strong className="text-[#121212]">{selectedColorway.colorFamilies?.join(', ') || 'Chưa chọn'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColorway(selectedColorway);
                              setColorwayModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-medium border border-[#e5e5e0] bg-white text-[#121212] hover:bg-[#f8f8f6] rounded transition-colors"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setDeleteColorwayTarget(selectedColorway)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 bg-white rounded transition-colors disabled:opacity-50"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {/* Images Manager */}
                      <div className="bg-[#fcfcfb] p-4 rounded border border-[#e5e5e0]">
                        <ColorwayImageManager
                          colorwayId={selectedColorway.id}
                          images={selectedColorway.images || []}
                          token={token}
                          onSuccess={(msg) => {
                            addToast('success', msg);
                            fetchData();
                          }}
                          onError={(msg) => addToast('error', msg)}
                        />
                      </div>

                      {/* Variants & Stock Table */}
                      <div className="bg-[#fcfcfb] p-4 rounded border border-[#e5e5e0] space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                              Kích cỡ & Tồn kho (Sizes) ({selectedColorway.variants?.length || 0})
                            </h5>
                            <p className="text-[11px] text-[#71717a]">
                              Quản lý các size của phối màu này. Cập nhật tồn kho có cơ chế tránh xung đột.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVariant(null);
                              setVariantModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#121212] text-white hover:bg-black rounded transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm Size
                          </button>
                        </div>

                        {!selectedColorway.variants || selectedColorway.variants.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-[#e5e5e0] rounded text-xs text-[#71717a]">
                            Chưa có size nào. Vui lòng thêm ít nhất 1 size để phối màu đủ điều kiện kích hoạt.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-[#e5e5e0] rounded bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#f8f8f6] border-b border-[#e5e5e0] text-[#71717a]">
                                <tr>
                                  <th className="py-2.5 px-3 font-semibold uppercase">Size</th>
                                  <th className="py-2.5 px-3 font-semibold uppercase">Tồn kho</th>
                                  <th className="py-2.5 px-3 font-semibold uppercase">Đơn hàng liên quan</th>
                                  <th className="py-2.5 px-3 font-semibold uppercase text-right">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e5e5e0]">
                                {selectedColorway.variants.map((v) => {
                                  const orderCount = v._count?.orderItems || 0;
                                  return (
                                    <tr key={v.id} className="hover:bg-[#f8f8f6]">
                                      <td className="py-2.5 px-3 font-bold text-[#121212]">
                                        {v.size}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span
                                          className={`font-semibold ${
                                            v.stock === 0 ? 'text-red-600' : 'text-[#121212]'
                                          }`}
                                        >
                                          {v.stock}
                                        </span>
                                        {v.stock === 0 && (
                                          <span className="ml-1 text-[10px] text-red-500 font-medium">(Hết hàng)</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-[#71717a]">
                                        {orderCount > 0 ? (
                                          <span className="text-[#121212] font-medium">{orderCount} đơn</span>
                                        ) : (
                                          '0'
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setStockTargetVariant(v);
                                              setStockModalOpen(true);
                                            }}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#e5e5e0] rounded hover:border-[#121212] text-[#121212] transition-colors"
                                          >
                                            Sửa kho
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingVariant(v);
                                              setVariantModalOpen(true);
                                            }}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#e5e5e0] rounded hover:border-[#121212] text-[#121212] transition-colors"
                                          >
                                            Đổi size
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteVariantTarget(v)}
                                            className="px-2 py-1 text-[11px] font-medium border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                                          >
                                            Xóa
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modals */}
            {/* Colorway Modal */}
            <ColorwayModal
              isOpen={colorwayModalOpen}
              onClose={() => {
                setColorwayModalOpen(false);
                setEditingColorway(null);
              }}
              token={token}
              productId={productId}
              colorway={editingColorway}
              colorFamiliesList={meta.colorFamilies}
              onSuccess={(msg) => {
                addToast('success', msg);
                fetchData();
              }}
            />

            {/* Variant Modal */}
            <VariantModal
              isOpen={variantModalOpen}
              onClose={() => {
                setVariantModalOpen(false);
                setEditingVariant(null);
              }}
              token={token}
              colorwayId={selectedColorwayId}
              variant={editingVariant}
              onSuccess={(msg) => {
                addToast('success', msg);
                fetchData();
              }}
            />

            {/* Variant Stock Modal */}
            <VariantStockModal
              isOpen={stockModalOpen}
              onClose={() => {
                setStockModalOpen(false);
                setStockTargetVariant(null);
              }}
              token={token}
              variant={stockTargetVariant}
              onSuccess={(msg) => {
                addToast('success', msg);
                fetchData();
              }}
            />

            {/* Confirm Delete Product */}
            <ConfirmDeleteModal
              isOpen={deleteProductOpen}
              onClose={() => setDeleteProductOpen(false)}
              onConfirm={() => handleDeleteProduct(addToast)}
              title="Xóa sản phẩm"
              message={`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"? Thao tác này sẽ xóa toàn bộ phối màu, ảnh và kích cỡ liên quan.`}
              loading={actionLoading}
            />

            {/* Confirm Delete Colorway */}
            <ConfirmDeleteModal
              isOpen={Boolean(deleteColorwayTarget)}
              onClose={() => setDeleteColorwayTarget(null)}
              onConfirm={() => handleDeleteColorway(addToast)}
              title="Xóa phối màu"
              message={`Bạn có chắc chắn muốn xóa phối màu "${deleteColorwayTarget?.name}"? Các hình ảnh và kích cỡ của phối màu này sẽ bị xóa.`}
              loading={actionLoading}
            />

            {/* Confirm Delete Variant */}
            <ConfirmDeleteModal
              isOpen={Boolean(deleteVariantTarget)}
              onClose={() => setDeleteVariantTarget(null)}
              onConfirm={() => handleDeleteVariant(addToast)}
              title="Xóa kích cỡ"
              message={`Bạn có chắc muốn xóa kích cỡ "${deleteVariantTarget?.size}" khỏi phối màu này?`}
              loading={actionLoading}
            />
          </div>
        );
      }}
    </AdminPageShell>
  );
}
