const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s\-().]+$/;

export function validateEmail(email) {
  const value = typeof email === 'string' ? email.trim() : '';
  if (!value) return 'Vui lòng nhập email.';
  if (value.length > 150 || !EMAIL_PATTERN.test(value)) return 'Email không hợp lệ.';
  return '';
}

export function validateFullName(fullName) {
  const value = typeof fullName === 'string' ? fullName.trim() : '';
  if (!value) return 'Vui lòng nhập họ và tên.';
  if (value.length > 100) return 'Họ và tên không được vượt quá 100 ký tự.';
  return '';
}

export function validatePhone(phone) {
  const value = typeof phone === 'string' ? phone.trim() : '';
  const digitCount = (value.match(/\d/g) || []).length;
  if (!value) return 'Vui lòng nhập số điện thoại.';
  if (
    value.length > 20
    || !PHONE_PATTERN.test(value)
    || digitCount < 8
    || digitCount > 15
  ) {
    return 'Số điện thoại không hợp lệ (cần từ 8 đến 15 chữ số).';
  }
  return '';
}

export function validatePassword(password, label = 'Mật khẩu') {
  if (typeof password !== 'string' || password.length < 8) {
    return `${label} phải có ít nhất 8 ký tự.`;
  }

  if (new TextEncoder().encode(password).length > 72) {
    return `${label} không được vượt quá 72 byte UTF-8.`;
  }

  return '';
}

export function validatePasswordMatch(password, confirmation) {
  return password === confirmation ? '' : 'Xác nhận mật khẩu không khớp.';
}

export function validateAddress(address) {
  return typeof address === 'string' && address.length <= 2000
    ? ''
    : 'Địa chỉ không được vượt quá 2.000 ký tự.';
}
