/**
 * adminErrorMessage — Maps backend error codes to friendly Vietnamese messages.
 */
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.',
  UNAUTHORIZED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
  PRODUCT_NOT_READY: 'Sản phẩm chưa đủ điều kiện mở bán. Vui lòng kiểm tra danh sách bên dưới.',
  COLORWAY_NOT_READY: 'Phối màu chưa đủ điều kiện kích hoạt (cần tối thiểu 3 ảnh, 1 ảnh đại diện và 1 kích cỡ).',
  DEFAULT_COLORWAY_REQUIRED: 'Vui lòng chọn một phối màu khác làm mặc định trước khi tắt hoặc xóa phối màu này.',
  ACTIVE_COLORWAY_REQUIRED: 'Sản phẩm đang bán phải có ít nhất một phối màu hoạt động.',
  PRODUCT_SLUG_EXISTS: 'Đường dẫn (slug) sản phẩm đã tồn tại. Vui lòng chọn đường dẫn khác.',
  COLORWAY_SLUG_EXISTS: 'Slug phối màu đã tồn tại trong sản phẩm này. Vui lòng dùng slug khác.',
  PRODUCT_IN_USE: 'Sản phẩm đã có lịch sử đơn hàng hoặc đánh giá; không thể xóa, hãy chuyển sang ngừng bán.',
  BRAND_IN_USE: 'Thương hiệu đang có sản phẩm liên kết; không thể xóa.',
  CATEGORY_IN_USE: 'Danh mục đang có sản phẩm liên kết; không thể xóa.',
  COLORWAY_IN_USE: 'Phối màu đã có lịch sử đơn hàng; không thể xóa, hãy chuyển sang ngừng hoạt động.',
  VARIANT_IN_USE: 'Kích cỡ đã có lịch sử đơn hàng; không thể đổi cỡ hoặc xóa. Hãy đặt tồn kho về 0.',
  VARIANT_SIZE_EXISTS: 'Kích cỡ này đã có trong phối màu hiện tại.',
  STOCK_CONFLICT: 'Số lượng tồn kho trên máy chủ vừa thay đổi. Dữ liệu đã được làm mới, vui lòng thử lại.',
  IMAGE_LIMIT_REACHED: 'Mỗi phối màu chỉ hỗ trợ tối đa 4 ảnh.',
  IMAGE_TOO_LARGE: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 8 MB).',
  INVALID_IMAGE_TYPE: 'Chỉ hỗ trợ tệp hình ảnh định dạng JPEG, PNG, WebP hoặc AVIF.',
  SELF_MANAGEMENT_NOT_ALLOWED: 'Không thể tự vô hiệu hóa, tự xóa hoặc tự reset mật khẩu của tài khoản đang đăng nhập.',
  LAST_ACTIVE_ADMIN: 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên hoạt động.',
  ADMIN_ACCOUNT_EXISTS: 'Email quản trị đã tồn tại. Vui lòng dùng email khác.',
  ADMIN_NOT_FOUND: 'Không tìm thấy tài khoản quản trị.',
  BRAND_NOT_FOUND: 'Không tìm thấy thương hiệu.',
  CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục.',
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm.',
  COLORWAY_NOT_FOUND: 'Không tìm thấy phối màu.',
  VARIANT_NOT_FOUND: 'Không tìm thấy kích cỡ.',
  IMAGE_NOT_FOUND: 'Không tìm thấy ảnh.',
  BRAND_SLUG_EXISTS: 'Slug thương hiệu đã tồn tại. Vui lòng chọn slug khác.',
  CATEGORY_SLUG_EXISTS: 'Slug danh mục đã tồn tại. Vui lòng chọn slug khác.',
  PASSWORD_CHANGE_FAILED: 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường nhập liệu.',
  ADMIN_ACCOUNT_CONFLICT: 'Tài khoản quản trị vừa thay đổi. Vui lòng thử lại.',
};

export function adminErrorMessage(error) {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  return ERROR_MESSAGES[error.code] || error.message || 'Đã xảy ra lỗi không xác định.';
}

/**
 * Converts a string to a URL-safe slug.
 */
export function toSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Formats a number as VND currency.
 */
export function formatVND(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

/**
 * Formats a date string in Vietnamese locale.
 */
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

/**
 * Returns true if an error is an auth failure that should log out the admin.
 */
export function isAdminUnauthorized(error) {
  return error?.status === 401;
}
