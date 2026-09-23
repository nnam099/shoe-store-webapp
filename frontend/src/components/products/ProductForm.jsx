import { FormField } from "../forms/FormField.jsx";

export function ProductForm({ value, options, errors = {}, disabled = false, onChange }) {
  function change(event) {
    onChange({ ...value, [event.target.name]: event.target.value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormField label="Tên sản phẩm" name="name" value={value.name} onChange={change} error={errors.name} /></div>
      <label className="grid gap-2 text-sm font-medium"><span>Loại giày</span><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" name="categoryId" value={value.categoryId} onChange={change} disabled={disabled}><option value="">Chọn loại giày</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.categoryId ? <span role="alert" className="text-coral">{errors.categoryId}</span> : null}</label>
      <label className="grid gap-2 text-sm font-medium"><span>Thương hiệu</span><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" name="brandId" value={value.brandId} onChange={change} disabled={disabled}><option value="">Chọn thương hiệu</option>{options.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.brandId ? <span role="alert" className="text-coral">{errors.brandId}</span> : null}</label>
      <FormField label="Giá bán (VND)" name="price" type="number" min="1" step="1" value={value.price} onChange={change} error={errors.price} disabled={disabled} />
      <FormField label="Giá khuyến mãi (tùy chọn)" name="salePrice" type="number" min="1" step="1" value={value.salePrice} onChange={change} error={errors.salePrice} disabled={disabled} />
      <label className="grid gap-2 text-sm font-medium"><span>Nhãn trang trí</span><select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" name="badgeLabel" value={value.badgeLabel} onChange={change} disabled={disabled}><option value="">Không gắn</option><option value="new">Mới</option><option value="bestseller">Bán chạy</option><option value="featured">Nổi bật</option></select></label>
      <FormField label="Chất liệu (tùy chọn)" name="material" value={value.material} onChange={change} error={errors.material} disabled={disabled} />
      <label className="grid gap-2 text-sm font-medium sm:col-span-2"><span>Mô tả (tùy chọn)</span><textarea className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2" name="description" value={value.description} onChange={change} disabled={disabled} />{errors.description ? <span role="alert" className="text-coral">{errors.description}</span> : null}</label>
    </div>
  );
}
