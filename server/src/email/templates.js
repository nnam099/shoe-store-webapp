function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shell(title, body) {
  return `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#121212;line-height:1.5"><div style="max-width:640px;margin:auto"><h1 style="font-size:20px">${escapeHtml(title)}</h1>${body}<p style="color:#737373;font-size:12px">STEP/LAB</p></div></body></html>`;
}

export function renderOtpEmail({ code, expiresMinutes = 5, purpose = 'checkout' }) {
  const action = purpose === 'password-setup' ? 'thiết lập mật khẩu' : 'xác nhận đặt hàng';
  return {
    subject: `Mã xác thực STEP/LAB: ${code}`,
    text: `Mã xác thực để ${action} là ${code}. Mã có hiệu lực ${expiresMinutes} phút. Không chia sẻ mã này.`,
    html: shell('Mã xác thực STEP/LAB', `<p>Mã để ${escapeHtml(action)}:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p><p>Mã có hiệu lực ${expiresMinutes} phút. Không chia sẻ mã này.</p>`),
  };
}

export function renderPasswordResetEmail({ resetUrl }) {
  return {
    subject: 'Đặt lại mật khẩu STEP/LAB',
    text: `Mở liên kết sau trong vòng 15 phút để đặt lại mật khẩu: ${resetUrl}\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: shell('Đặt lại mật khẩu STEP/LAB', `<p>Liên kết chỉ dùng một lần và có hiệu lực 15 phút.</p><p><a href="${escapeHtml(resetUrl)}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`),
  };
}

export function renderPasswordChangedEmail({ fullName, action }) {
  const safeAction = action === 'setup' ? 'thiết lập' : action === 'reset' ? 'đặt lại' : 'thay đổi';
  return {
    template: 'PASSWORD_CHANGED',
    subject: 'Mật khẩu STEP/LAB đã được cập nhật',
    text: `Xin chào ${fullName}, mật khẩu tài khoản STEP/LAB vừa được ${safeAction}. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.`,
    html: shell('Mật khẩu đã được cập nhật', `<p>Xin chào ${escapeHtml(fullName)},</p><p>Mật khẩu tài khoản STEP/LAB vừa được ${escapeHtml(safeAction)}. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.</p>`),
  };
}

export function renderOrderCreatedEmail({ order, trackingUrl }) {
  const rows = order.items.map((item) => `${item.productName} — ${item.colorwayName}, EU ${item.size} × ${item.quantity}: ${item.lineTotal} VND`);
  const htmlRows = order.items.map((item) => `<li>${escapeHtml(item.productName)} — ${escapeHtml(item.colorwayName)}, EU ${escapeHtml(item.size)} × ${item.quantity}: ${item.lineTotal} VND</li>`).join('');
  return {
    template: 'ORDER_CREATED',
    subject: `STEP/LAB đã nhận đơn ${order.orderCode}`,
    text: `Mã đơn: ${order.orderCode}\n${rows.join('\n')}\nTạm tính: ${order.subtotal} VND\nPhí vận chuyển: ${order.shippingFee} VND\nTổng: ${order.total} VND\nThanh toán: COD\nNgười nhận: ${order.receiverName}, ${order.receiverPhone}\nĐịa chỉ: ${order.receiverAddress}\nTheo dõi đơn: ${trackingUrl}`,
    html: shell(`Đã nhận đơn ${order.orderCode}`, `<p>Đơn COD của bạn đã được tạo.</p><ul>${htmlRows}</ul><p>Tạm tính: <strong>${order.subtotal} VND</strong><br>Phí vận chuyển: <strong>${order.shippingFee} VND</strong><br>Tổng: <strong>${order.total} VND</strong></p><p>Người nhận: ${escapeHtml(order.receiverName)} — ${escapeHtml(order.receiverPhone)}<br>Địa chỉ: ${escapeHtml(order.receiverAddress)}</p><p><a href="${escapeHtml(trackingUrl)}">Theo dõi đơn hàng</a> (bạn vẫn cần nhập số điện thoại để xem đơn).</p>`),
  };
}
