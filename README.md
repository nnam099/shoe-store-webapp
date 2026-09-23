# SẢI — Website bán giày trực tuyến

Khung dự án cho website thương mại điện tử bán giày của đồ án Lập trình web PTIT. Hệ thống hiện có frontend React/Vite, backend Express và PostgreSQL; trang chủ được giữ trắng để sẵn sàng phát triển giao diện ở plan tiếp theo.

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

- Frontend: <http://localhost:5173> (trang trắng theo phạm vi hiện tại)
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
| `POST` | `/api/cart/merge` | Customer |
| `GET`, `PATCH` | `/api/account/profile` | Customer |
| `PUT` | `/api/account/password` | Customer |
| `POST` | `/api/admin/auth/login` | Guest/Admin |
| `GET` | `/api/admin` | Admin |

Customer dùng access token 24 giờ; Admin dùng access token 8 giờ. Frontend lưu token trong `localStorage`, gửi qua `Authorization: Bearer <token>` và đăng xuất bằng cách xóa token phía client. Không có refresh token.

Các biến cấu hình liên quan gồm `JWT_SECRET` (tối thiểu 32 ký tự), `VITE_API_BASE_URL`, `CORS_ORIGIN`, `RATE_LIMIT_LOGIN_MAX` và `RATE_LIMIT_REGISTER_MAX`; xem đầy đủ trong `.env.example`.

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
npm run lint

# Frontend
Set-Location ../frontend
npm ci
npm run dev
npm test
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
- Quy tắc làm việc: `AGENTS.md`
