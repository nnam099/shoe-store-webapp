export const categories = ["Giày chạy bộ", "Giày thời trang", "Giày bóng rổ", "Giày luyện tập"];

export const brands = ["Nike", "Adidas", "New Balance", "Puma", "Converse"];

export const sizes = ["38", "39", "40", "41", "42", "43"];

export const colors = [
  { name: "Đen", hexCode: "#111111" },
  { name: "Trắng", hexCode: "#F5F5F5" },
  { name: "Xanh cobalt", hexCode: "#2454D6" },
  { name: "Đỏ san hô", hexCode: "#E5624D" },
  { name: "Xám", hexCode: "#7A7F87" },
];

const productNames = [
  "Sải Air Flow",
  "Sải City Walk",
  "Sải Court Pro",
  "Sải Daily Move",
  "Sải Energy Run",
  "Sải Flex Trainer",
  "Sải Glide Street",
  "Sải Horizon",
  "Sải Ignite",
  "Sải Journey",
  "Sải Kinetic",
  "Sải Lite Step",
  "Sải Motion",
  "Sải Nova",
  "Sải Orbit",
  "Sải Pace",
  "Sải Quest",
  "Sải Rhythm",
  "Sải Sprint",
  "Sải Tempo",
];

const badgeLabels = ["new", "bestseller", "featured", null];

export const products = productNames.map((name, index) => ({
  name,
  searchName: name.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  description: `Mẫu giày ${name} dành cho dữ liệu phát triển.`,
  material: index % 2 === 0 ? "Vải dệt và cao su" : "Da tổng hợp và cao su",
  price: 850000 + index * 50000,
  salePrice: index % 3 === 0 ? 790000 + index * 40000 : null,
  badgeLabel: badgeLabels[index % badgeLabels.length],
  categoryName: categories[index % categories.length],
  brandName: brands[index % brands.length],
  imagePath: `seed-shoe-${String(index + 1).padStart(2, "0")}.webp`,
  variants: [
    {
      sizeValue: sizes[index % sizes.length],
      colorName: colors[index % colors.length].name,
      stockQuantity: 8 + (index % 7),
    },
    {
      sizeValue: sizes[(index + 1) % sizes.length],
      colorName: colors[(index + 2) % colors.length].name,
      stockQuantity: 3 + (index % 5),
    },
  ],
}));

export const customers = [
  {
    fullName: "Nguyễn Minh Anh",
    email: "minh.anh@example.com",
    phone: "0900000001",
    province: "Hà Nội",
    district: "Ba Đình",
    ward: "Phúc Xá",
    addressLine: "Số 1 phố Mẫu",
  },
  {
    fullName: "Trần Hoàng Nam",
    email: "hoang.nam@example.com",
    phone: "0900000002",
    province: "Thành phố Hồ Chí Minh",
    district: "Quận 1",
    ward: "Bến Nghé",
    addressLine: "Số 2 đường Mẫu",
  },
  {
    fullName: "Lê Thu Hà",
    email: "thu.ha@example.com",
    phone: "0900000003",
    province: "Đà Nẵng",
    district: "Hải Châu",
    ward: "Thạch Thang",
    addressLine: "Số 3 đường Mẫu",
  },
];

export const seedOrders = [
  { code: "DH260921-SEED2A", status: "pending_confirmation", customerIndex: null },
  { code: "DH260921-SEED3B", status: "preparing", customerIndex: 0 },
  { code: "DH260921-SEED4C", status: "shipping", customerIndex: null },
  { code: "DH260921-SEED5D", status: "delivered", customerIndex: 1 },
  { code: "DH260921-SEED6E", status: "completed", customerIndex: 2 },
  { code: "DH260921-SEED7F", status: "cancelled", customerIndex: null },
];

export const statusPaths = {
  pending_confirmation: ["pending_confirmation"],
  preparing: ["pending_confirmation", "preparing"],
  shipping: ["pending_confirmation", "preparing", "shipping"],
  delivered: ["pending_confirmation", "preparing", "shipping", "delivered"],
  completed: ["pending_confirmation", "preparing", "shipping", "delivered", "completed"],
  cancelled: ["pending_confirmation", "cancelled"],
};
