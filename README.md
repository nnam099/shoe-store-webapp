# SẢI — Website bán giày trực tuyến

Website thương mại điện tử bán giày của đồ án Lập trình web PTIT. Hệ thống dùng frontend React/Vite, backend Express và PostgreSQL; hiện đã có xác thực Customer/Admin, quản lý sản phẩm Admin, luồng công khai xem sản phẩm và giỏ hàng Guest/Customer.

## Yêu cầu

- Docker Desktop có Docker Compose, hoặc Node.js 24 và PostgreSQL 18 nếu chạy từng phần ở máy host.
- Các cổng mặc định còn trống: frontend `5173`, backend `3000`.

## Chạy nhanh bằng Docker

Không bắt buộc tạo `.env` để chạy local; Compose có sẵn giá trị phát triển giả. Nếu muốn đổi cổng hoặc cấu hình, sao chép `.env.example` thành `.env` và chỉ dùng thông tin local:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Sau khi ba container healthy:

- Trang chủ công khai: <http://localhost:5173>
- Danh sách sản phẩm công khai: <http://localhost:5173/san-pham>
- Giỏ hàng: <http://localhost:5173/gio-hang>
- Health API: <http://localhost:3000/api/health>
- Đăng ký Customer: <http://localhost:5173/dang-ky>
- Đăng nhập Customer: <http://localhost:5173/dang-nhap>
- Đăng nhập Admin: <http://localhost:5173/admin/dang-nhap>
- Quản lý sản phẩm Admin: <http://localhost:5173/admin/san-pham>
- Quản lý danh mục/thuộc tính Admin: <http://localhost:5173/admin/danh-muc>

Backend tự chạy migration và seed idempotent khi `RUN_SEED=true`. Dừng hệ thống mà vẫn giữ dữ liệu:

```powershell
docker compose down
```

Không thêm `-v` nếu muốn giữ hai volume `postgres_data` và `uploaded_images`.

## Tài khoản mẫu local

Khi `RUN_SEED=true`, seed tạo các tài khoản chỉ dùng cho môi trường phát triển:

| Vai trò | Tài khoản | Mật khẩu mặc định local |
|---|---|---|
| Customer | `minh.anh@example.com` hoặc `0900000001` | `Customer123!` |
| Admin | Giá trị `ADMIN_SEED_EMAIL` (`admin@example.com` mặc định) | Giá trị `ADMIN_SEED_PASSWORD` (`development_only_password` mặc định) |

Hãy đổi `JWT_SECRET`, mật khẩu database và mật khẩu Admin khi chạy ngoài máy phát triển. Không commit file `.env`.

## API xác thực

| Method | Endpoint | Quyền |
|---|---|---|
| `POST` | `/api/auth/register` | Guest |
| `POST` | `/api/auth/login` | Guest/Customer |
| `GET` | `/api/auth/session` | Customer hoặc Admin |
| `GET`, `PATCH` | `/api/account/profile` | Customer |
| `PUT` | `/api/account/password` | Customer |
| `POST` | `/api/admin/auth/login` | Guest/Admin |
| `GET` | `/api/admin` | Admin |

Customer dùng access token 24 giờ; Admin dùng access token 8 giờ. Frontend lưu token trong `localStorage`, gửi qua `Authorization: Bearer <token>` và đăng xuất bằng cách xóa token phía client. Không có refresh token.

Các biến cấu hình liên quan gồm `JWT_SECRET` (tối thiểu 32 ký tự), `VITE_API_BASE_URL`, `CORS_ORIGIN`, `RATE_LIMIT_LOGIN_MAX` và `RATE_LIMIT_REGISTER_MAX`; xem đầy đủ trong `.env.example`.

## API sản phẩm công khai

Ba endpoint xem sản phẩm không yêu cầu access token:

| Method | Endpoint | Nội dung |
|---|---|---|
| `GET` | `/api/products` | Tìm kiếm, lọc, sắp xếp và phân trang 12 sản phẩm/trang |
| `GET` | `/api/products/options` | Thương hiệu, loại, size và màu dùng cho bộ lọc |
| `GET` | `/api/products/:slug` | Chi tiết, thư viện ảnh và tồn kho theo biến thể |

Danh sách nhận các query `q`, `brandId`, `categoryId`, `sizeId`, `colorId`, `minPrice`, `maxPrice`, `sort`, `page`. Các khóa ID có thể lặp; giá trị cùng nhóm kết hợp OR, các nhóm kết hợp AND, còn size và màu phải khớp cùng một biến thể còn hàng. `sort` nhận `newest`, `price_asc`, `price_desc`, `name_asc`.

Response danh sách chỉ có `inStock`; không trả số lượng tồn chính xác. Số tồn theo biến thể chỉ có ở API chi tiết. Guest thêm giỏ trong `localStorage`; Customer dùng `POST /api/cart/items` với Bearer token.

Trang chủ dùng lại `GET /api/products/options` cho shortcut danh mục và trang đầu của `GET /api/products?sort=newest&page=1` cho dải tối đa 12 sản phẩm mới nhất; không có endpoint riêng cho trang chủ.

## API giỏ hàng

Trang `/gio-hang` dùng được khi chưa đăng nhập. Guest chỉ lưu `productVariantId` và `quantity` trong `localStorage`; khi hiển thị, frontend luôn gọi backend để lấy lại giá hiệu lực, tồn kho và trạng thái xóa mềm hiện hành. Customer lưu giỏ trong PostgreSQL và mọi thao tác đọc/ghi đều dùng Bearer token.

| Method | Endpoint | Quyền và nội dung |
|---|---|---|
| `POST` | `/api/cart/validate` | Công khai; kiểm tra tối đa 100 dòng Guest, chỉ đọc database |
| `POST` | `/api/cart/merge` | Customer; gộp giỏ Guest sau đăng nhập |
| `GET` | `/api/cart` | Customer; đọc giỏ của tài khoản trong token |
| `POST` | `/api/cart/items` | Customer; thêm/cộng dồn một biến thể |
| `PATCH` | `/api/cart/items/:productVariantId` | Customer; đặt số lượng cuối cùng của dòng |
| `DELETE` | `/api/cart/items/:productVariantId` | Customer; xóa dòng, idempotent |

Response giỏ trả `unitPrice`, `lineTotal`, `subtotal`, `totalQuantity` và trạng thái từng dòng: `available`, `insufficient_stock`, `out_of_stock`, `not_for_sale`. `subtotal` chỉ cộng dòng đang khả dụng. Giỏ không giữ chỗ hay trừ tồn kho; checkout sẽ kiểm tra lại ở chức năng sau.

## API quản lý sản phẩm Admin

Tất cả endpoint dưới `/api/admin/products` và `/api/admin/catalog` đều yêu cầu access token Admin qua `Authorization: Bearer <token>`.

| Nhóm | Method và endpoint |
|---|---|
| Danh sách/tạo sản phẩm | `GET /api/admin/products`, `POST /api/admin/products` |
| Lựa chọn cho form | `GET /api/admin/products/options` |
| Chi tiết/sửa/xóa mềm | `GET /api/admin/products/:productId`, `PATCH /api/admin/products/:productId`, `DELETE /api/admin/products/:productId` |
| Ảnh | `POST /api/admin/products/:productId/images`, `PUT /api/admin/products/:productId/images/order`, `DELETE /api/admin/products/:productId/images/:imageId` |
| Biến thể | `POST /api/admin/products/:productId/variants`, `PATCH /api/admin/products/:productId/variants/:variantId`, `DELETE /api/admin/products/:productId/variants/:variantId` |
| Loại/thương hiệu/size/màu | `GET /api/admin/catalog/:resource`, `POST /api/admin/catalog/:resource`, `PATCH /api/admin/catalog/:resource/:id`, `DELETE /api/admin/catalog/:resource/:id` |

Request tạo sản phẩm dùng `multipart/form-data`: trường `data` chứa JSON metadata và trường `images` chứa 1–8 ảnh. Upload thêm ảnh cũng dùng trường `images`. Backend chỉ nhận JPG, PNG hoặc WebP theo magic bytes, tối đa 5 MiB mỗi file và 8 file mỗi request; tên file được sinh ngẫu nhiên. URL ảnh công khai nằm dưới `/uploads`, còn file được giữ trong Docker volume `uploaded_images`, kể cả khi bản ghi ảnh hoặc sản phẩm bị xóa mềm.

## Chạy và kiểm thử cục bộ

```powershell
# Backend
Set-Location backend
npm ci
npm run dev
npm test
npm run test:coverage
npm run lint

# Frontend
Set-Location ../frontend
npm ci
npm run dev
npm test
npm run test:coverage
npm run lint
npm run build
```

Các lệnh migration cần `DATABASE_URL`. Test tích hợp cần một PostgreSQL riêng và `TEST_DATABASE_URL` phải trỏ đến database có tên kết thúc bằng `_test`; script sẽ từ chối reset database không có hậu tố này.

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "postgres://shoe_store:dev_only_change_me@localhost:5432/shoe_store_test"
npm run test:integration
npm run test:seed
```

## Tài liệu

- Nghiệp vụ: `docs/nghiep-vu.md`
- Schema đã duyệt: `docs/schema.md`
- Plan khung dự án: `docs/plans/2026-09-21-khung-du-an.md`
- Plan khách xem sản phẩm: `docs/plans/2026-09-24-khach-xem-san-pham.md`
- Plan giỏ hàng: `docs/plans/2026-09-25-gio-hang.md`
- Plan trang chủ: `docs/plans/2026-09-26-trang-chu.md`
- Quy tắc làm việc: `AGENTS.md`
