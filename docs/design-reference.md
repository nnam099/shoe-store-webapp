# Tài liệu tham khảo thiết kế giao diện

| | |
|---|---|
| Nguồn tham khảo | Repo `web-biz-interface` (dựng bằng Lovable, stack TanStack Start + Tailwind v4 + Radix) |
| Áp dụng vào | Frontend React (Vite) đã chốt trong `AGENTS.md` |
| Trạng thái | Đã xác nhận các quyết định thiết kế tại mục 7 |

**Đây là tài liệu về hình thức (màu, chữ, bố cục, component), không phải về stack.** Repo tham khảo dùng TanStack Start, Bun, React 19, Radix UI — khác với stack đã chốt (React + Vite, Node/Express tách riêng). Codex chỉ lấy phong cách ở tài liệu này, dựng lại bằng đúng stack đã chốt, và phải khớp với `docs/nghiep-vu.md` — nếu hai tài liệu lệch nhau, `docs/nghiep-vu.md` thắng.

## 1. Quyết định đã chốt

Đã chốt **Tailwind CSS v4**, không dùng thêm bộ component đầy đủ như Radix/shadcn ở giai đoạn đầu (dự án nhỏ, thêm thư viện là thêm việc học và thêm rủi ro lỗi bản build). Style thuần Tailwind vẫn dựng được mọi thứ ở tài liệu này. Nếu sau này thấy cần (ví dụ modal, dropdown phức tạp), bổ sung từng thư viện nhỏ theo plan riêng, không cài trọn bộ ngay từ đầu.

Nếu bạn muốn giữ nguyên cảm giác "kính mờ" và các hiệu ứng ở bản mẫu mà không cần Radix, Tailwind thuần vẫn làm được (dùng `backdrop-blur`, `border`, `shadow`).

## 2. Bản sắc và tông màu

Thương hiệu của cửa hàng là **SẢI**, với slogan **“Sải bước, đúng chất.”** Giữ nguyên hệ màu và tông chữ đã chọn từ repo mẫu.

### Bảng màu (dùng định dạng OKLCH, giữ để dễ chỉnh độ sáng/độ bão hòa mà không lệch tông)

| Token | Giá trị | Vai trò |
|---|---|---|
| `--background` | `oklch(0.95 0.018 245)` | Nền trang (xanh xám rất nhạt, không dùng trắng thuần) |
| `--foreground` | `oklch(0.19 0.025 260)` | Màu chữ chính (than đậm, không dùng đen thuần) |
| `--primary` / `--cobalt` | `oklch(0.55 0.25 264)` | Xanh cobalt — nút chính, liên kết nhấn, viền focus |
| `--cobalt-deep` | `oklch(0.48 0.22 264)` | Trạng thái hover của màu chính |
| `--ink` | `oklch(0.19 0.025 260)` | Nền tối (header admin, nút "dark", footer) |
| `--coral` | `oklch(0.68 0.21 34)` | Badge nhấn mạnh (ví dụ "Nổi bật", cảnh báo nhẹ) |
| `--mint` | `oklch(0.72 0.15 170)` | Badge trạng thái tích cực (còn hàng) |
| `--amber` | `oklch(0.81 0.17 77)` | Badge trạng thái cảnh báo/trung tính |
| `--muted-foreground` | `oklch(0.48 0.025 252)` | Chữ phụ, nhãn, chú thích |
| `--border` / `--line` | `oklch(0.28 0.025 260 / 16%)` | Viền mảnh cho card/input |
| `--surface` | `oklch(1 0 0)` | Nền card khi hover/nổi bật (trắng thuần) |
| `--surface-glass` | `oklch(1 0 0 / 58%)` | Nền card mặc định, kết hợp `backdrop-blur` |

**Ánh xạ màu theo trạng thái nghiệp vụ** (để nhất quán, không tự chế thêm màu khi code từng trang):

| Trạng thái | Màu |
|---|---|
| Còn hàng (`SP-07`) | `mint` |
| Hết hàng | `muted-foreground`, chữ gạch nhạt, nút vô hiệu |
| Trạng thái đơn: Chờ xác nhận | `amber` |
| Trạng thái đơn: Đang chuẩn bị, Đang giao | `cobalt` |
| Trạng thái đơn: Đã giao, Hoàn thành | `mint` |
| Trạng thái đơn: Hủy | `coral` (dùng làm cảnh báo, không dùng đỏ gắt) |

### Kiểu chữ

- **Chữ tiêu đề (`font-display`):** một font sans hiện đại, đậm, có cá tính — bản mẫu dùng "Space Grotesk". Có thể giữ nguyên hoặc đổi sang font khác miễn cùng phong cách (geometric sans). Dùng cho: tên thương hiệu, `<h1>`/`<h2>`, tên sản phẩm, giá tiền.
- **Chữ nhãn (`font-mono`):** một font mono — bản mẫu dùng "JetBrains Mono". Dùng cho: nhãn viết hoa cỡ nhỏ (ví dụ "DANH MỤC", "SẢN PHẨM NỔI BẬT"), mã đơn hàng, số tiền phụ, timestamp. Không dùng cho đoạn văn dài.
- **Chữ nội dung:** font hệ thống mặc định (system-ui) cho mô tả, đoạn văn, form.
- Cả hai font tải qua Google Fonts hoặc self-host, có `font-display: swap` để không chặn render.

### Bo góc, viền, độ sâu

- Bo góc nhất quán: `0.5rem` (8px) cho input/button nhỏ, `0.75–1rem` cho card lớn. Không dùng bo góc quá lớn (không phù hợp phong cách "gọn, kỹ thuật" của bản mẫu).
- Card mặc định: nền `surface-glass` + `backdrop-blur` nhẹ + viền `1px solid var(--border)`. Khi hover: đổi sang `surface` (trắng đặc) + nhích lên nhẹ (`translateY(-2px)` hoặc tương đương), có `transition`.
- Không dùng đổ bóng nặng (`box-shadow` lớn). Ưu tiên viền mảnh + độ trong suốt để tạo chiều sâu.

## 3. Bố cục chung

- **Chiều rộng nội dung tối đa:** khoảng `1200–1440px`, căn giữa, có padding ngang responsive (`clamp` hoặc breakpoint Tailwind).
- **Header:** sticky trên cùng, nền mờ (`backdrop-blur` + nền bán trong suốt), gồm: logo/tên cửa hàng bên trái, menu chính giữa (Trang chủ, Sản phẩm, Danh mục, Tra cứu đơn), ô tìm kiếm, nút Đăng nhập, nút Giỏ hàng có badge số lượng. Menu thu gọn thành nút hamburger ở màn hình nhỏ (`UI-03`).
- **Footer:** hai lớp — một dải thông tin ngắn (chính sách COD, phí ship, ghi chú tồn kho theo size) nền tối, và một footer liên kết bên dưới cùng.
- **Trang danh sách sản phẩm:** sidebar lọc bên trái (ẩn thành drawer/accordion trên mobile) + lưới sản phẩm bên phải. Thanh categories dạng pill ngang phía trên lưới là tùy chọn, không bắt buộc theo nghiệp vụ.
- **Trang admin:** layout tách biệt hẳn khỏi giao diện khách — sidebar tối cố định bên trái (thu gọn thành drawer trên mobile), nội dung nền sáng hơn (gần trắng) bên phải. Không dùng chung header/footer của trang khách.

## 4. Component mẫu

### Nút (Button)

4 biến thể, style dùng chung cho toàn hệ thống:

| Biến thể | Dùng khi | Style |
|---|---|---|
| `primary` | Hành động chính trên nền sáng (Thêm vào giỏ, Đặt hàng) | Nền `cobalt`, chữ trắng, hover đậm hơn |
| `dark` | Hành động chính trên nền tối hoặc cần nổi bật mạnh (Giỏ hàng ở header, Áp dụng bộ lọc) | Nền `ink`, chữ trắng |
| `outline` | Hành động phụ (Xem danh mục, Hủy) | Viền `line`, nền trong suốt/kính mờ |
| `ghost` | Hành động nhẹ, ít quan trọng | Không viền, chỉ đổi nền khi hover |

Chiều cao tối thiểu 40px (dễ bấm trên di động), bo góc theo mục 2, có trạng thái `disabled` rõ ràng (mờ + không cho click) — dùng cho nút "Thêm vào giỏ" khi biến thể hết hàng (`KH-05`).

### Card sản phẩm

- Ảnh vuông (tỷ lệ 1:1), bo góc, có hiệu ứng phóng nhẹ khi hover.
- Góc trên trái: badge trang trí tùy chọn "Mới", "Bán chạy" hoặc "Nổi bật". Admin gắn hoặc gỡ thủ công khi thêm/sửa sản phẩm theo `SP-15`; không tự động suy ra từ doanh số hay ngày tạo ở P1.
- Dưới ảnh: thương hiệu (chữ nhỏ, `muted-foreground`) phía trên tên sản phẩm (chữ đậm).
- Góc phải cùng hàng tên: badge tồn kho — **chỉ hiển thị "Còn hàng" (màu mint) hoặc "Hết hàng" (màu xám)**, không hiển thị số lượng cụ thể, đúng `SP-07`/`KH-04` (bản mẫu có hiển thị số lượng chính xác, không dùng theo cách đó).
- Hàng chọn size: các ô vuông nhỏ, size đang chọn có nền `ink`/`cobalt` + chữ trắng, size hết hàng (biến thể đó tồn kho = 0) hiển thị mờ và không bấm được (`KH-05`).
- Hàng dưới cùng: giá bên trái (định dạng `1.290.000₫`, dùng `Intl.NumberFormat('vi-VN')`), nút "Thêm vào giỏ" bên phải. Nếu sản phẩm có giá khuyến mãi, hiển thị giá gốc gạch ngang bên cạnh giá khuyến mãi (`SP-03`, `SP-04`).

### Sidebar lọc (trang danh sách)

- Nhóm lọc: Thương hiệu, Loại giày, Màu sắc (checkbox nhiều lựa chọn), Khoảng giá (hai ô nhập), Size (lưới nút vuông). Đúng theo `KH-04`.
- Tiêu đề mỗi nhóm: chữ mono nhỏ, viết hoa, màu phụ.
- Có nút "Xóa lọc" và nút "Áp dụng bộ lọc" (biến thể `dark`), hoặc lọc áp dụng ngay khi tick (tùy chọn UX, quyết định lúc code trang này).
- Trên mobile: sidebar gập thành drawer hoặc accordion, không chiếm ngang màn hình.

### Thanh sắp xếp và đếm kết quả

Phía trên lưới sản phẩm: bên trái hiện "Hiển thị N sản phẩm", bên phải là dropdown sắp xếp. Theo `KH-04`, dropdown phải có đủ 4 lựa chọn: **Mới nhất (mặc định), Giá tăng dần, Giá giảm dần, Tên A-Z** (bản mẫu chỉ có 3, thiếu "Tên A-Z" — nhớ bổ sung).

### Sidebar admin

- Nền tối (`ink`), logo/tên rút gọn ở trên cùng, danh sách mục menu có icon, mục đang chọn có nền `cobalt`.
- Menu đề xuất theo đúng chức năng đã có trong `docs/nghiep-vu.md`: Tổng quan, Sản phẩm, Danh mục & thuộc tính, Đơn hàng, Khách hàng, Tài khoản quản trị, Thống kê. (Bản mẫu có thêm mục "Tồn kho" riêng — có thể gộp vào trang Sản phẩm vì tồn kho quản lý theo biến thể trong cùng màn hình sửa sản phẩm, theo `QT-A02`.)
- Trên mobile: sidebar ẩn, có nút mở dạng drawer.

### Badge trạng thái đơn hàng (trang quản lý đơn, lịch sử mua hàng)

Dùng bảng ánh xạ màu ở mục 2. Hiển thị dạng pill nhỏ, chữ mono viết hoa, nền màu nhạt + chữ màu đậm cùng tông (không nền đặc màu chói).

## 5. Việc KHÔNG mang từ bản mẫu sang

- Không copy nguyên file component (`.tsx` dùng TanStack Router, import ảnh theo kiểu Vite của TanStack Start) — phải viết lại theo React Router hoặc điều hướng đã chọn cho dự án, và theo cấu trúc thư mục trong `AGENTS.md` mục 7.
- Không giữ dữ liệu sản phẩm hardcode trong file component (`store-data`) — dữ liệu phải lấy từ API backend.
- Không hiển thị số lượng tồn kho chính xác ở danh sách sản phẩm (chỉ "Còn hàng/Hết hàng" theo `SP-07`).
- Không tự động gắn badge "Mới/Bán chạy/Nổi bật" theo ngày tạo hoặc doanh số; chỉ hiển thị nhãn admin đã chọn theo `SP-15`.
- Không dùng Bun, TanStack Start, hay bộ Radix/shadcn đầy đủ trừ khi bạn quyết định đổi stack (không khuyến nghị, vì đã chốt và đã có schema/migration đi theo hướng Express riêng).

## 6. Việc cần làm khi bắt đầu code frontend

1. Dùng Tailwind CSS v4 theo lựa chọn đã ghi trong `AGENTS.md` mục 2.
2. Tạo file token màu/font dùng chung (biến CSS hoặc cấu hình Tailwind theme) dựa theo mục 2 của tài liệu này, đặt tên biến theo thương hiệu SẢI.
3. Dựng component dùng chung trước (Button, ProductCard, badge trạng thái, layout Header/Footer, layout Admin Sidebar) thành các file component riêng trong `frontend/src/components/`, có test cơ bản.
4. Từng trang lắp lại từ component dùng chung, nối với API thật — không hardcode dữ liệu mẫu trong trang.
5. Rà lại từng trang với mục 5 ở trên trước khi coi là xong, để không lỡ mang theo phần không khớp nghiệp vụ.

## 7. Các quyết định đã xác nhận

1. [x] Dùng **Tailwind CSS v4** làm thư viện CSS.
2. [x] Tên thương hiệu là **SẢI**; slogan là **“Sải bước, đúng chất.”**
3. [x] Giữ badge trang trí "Mới/Bán chạy/Nổi bật"; admin gắn hoặc gỡ thủ công theo `SP-15`.
4. [x] Giữ tông màu xanh cobalt và hiệu ứng kính mờ.
