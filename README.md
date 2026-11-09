# STEP/LAB — Website bán giày đa thương hiệu

STEP/LAB là hệ thống thương mại điện tử bán giày đa thương hiệu, được xây dựng trong học phần **Lập trình Web** và định hướng phát triển thành website có thể triển khai thực tế. Hệ thống phục vụ đồng thời hai nhóm người dùng:

- Khách hàng: khám phá sản phẩm, quản lý tài khoản, giỏ hàng, xác thực checkout và đặt hàng.
- Cửa hàng: quản trị catalog, tồn kho, khách hàng, đơn hàng, đánh giá và tài khoản Admin.

README mô tả đúng trạng thái hiện tại của dự án. Những tích hợp chưa được nghiệm thu với provider hoặc chưa triển khai public sẽ được ghi rõ, không được xem là chức năng production đã hoàn tất.

## Công nghệ

### Frontend

- React 19, React Router
- Vite
- Tailwind CSS
- Oxlint

### Backend và dữ liệu

- Node.js, Express, REST API
- Prisma ORM, PostgreSQL 16
- JWT cho Member và Admin
- bcryptjs để hash mật khẩu
- Google Identity Services và `google-auth-library`
- Nodemailer cho SMTP

### Triển khai

- Docker Compose
- Caddy phục vụ SPA, reverse proxy `/api/*` và HTTPS khi có domain
- PostgreSQL và uploads dùng persistent named volumes

## Chức năng và mức độ hoàn thiện

### Storefront và tài khoản khách hàng

- Catalog đa thương hiệu với Product, Colorway, Variant, size, tồn kho và bộ ảnh.
- Tìm kiếm, lọc, sắp xếp, phân trang và trang chi tiết sản phẩm.
- Giỏ hàng lưu trên trình duyệt và kiểm tra lại giá/tồn kho tại server.
- Đăng ký, đăng nhập, hồ sơ, đổi/quên/đặt lại mật khẩu và lịch sử đơn hàng.
- Google Login, quy tắc liên kết tài khoản và tài khoản Google-only.
- Đánh giá sản phẩm dành cho Member đã mua hàng hợp lệ.

### B1+B2 — đã hoàn thành và nghiệm thu

- Member authentication và Google Login/liên kết tài khoản.
- Gmail SMTP, OTP checkout, password setup/reset và các giới hạn chống lạm dụng.
- Checkout Intent có quote/version phía server và xác nhận email.
- Đặt hàng COD cho Guest/Member.
- Idempotency và concurrency safety: retry không tạo trùng Order, không trừ kho hoặc tạo email xác nhận hai lần.
- Email xác nhận đơn hàng qua outbox đối với email giao dịch thông thường.

### Admin — đang hoạt động

- Xác thực Admin tách biệt với Member.
- Dashboard, quản lý Brand, Category, Product, Colorway, ảnh, Variant và tồn kho.
- Quản lý tài khoản Admin, khách hàng, đơn hàng và đánh giá.
- Upload ảnh được kiểm tra định dạng và lưu trong vùng uploads riêng.

### B3 VNPAY Sandbox — chưa nghiệm thu provider

Source và automated tests cho B3 đang được phát triển, gồm Payment Attempt, IPN/Return, QueryDR, reservation tồn kho, retry và reconciliation. Phần này:

- Chưa được nghiệm thu E2E với VNPAY Sandbox thật.
- Chưa được áp dụng migration vào database development/production trong quy trình release.
- Không được xem là thanh toán online đang hoạt động thực tế.
- Đang tạm dừng để ưu tiên Docker/Hosting; sẽ được đồng bộ và nghiệm thu sau Hosting.

Docker baseline hiện tại dựa trên B1+B2 ổn định và không phải bản release B3.

## Cấu trúc dự án

```text
shoe-store-webapp/
├── client/                  # React/Vite frontend
│   ├── public/              # Static assets
│   └── src/                 # Pages, components, contexts, services
├── server/                  # Express/Prisma backend
│   ├── prisma/              # Schema, migrations, seed và bootstrap tools
│   ├── src/                 # Routes, controllers, services, middleware
│   ├── test/                # Unit và integration tests
│   └── uploads/             # Managed product/brand uploads tại local
├── deploy/                  # Caddy, env examples và operational scripts
├── docs/                    # Đặc tả, database và deployment documentation
├── resources/               # Tài nguyên sản phẩm gốc
├── compose.yaml             # Docker Compose stack
└── README.md
```

## Chạy Development

### Yêu cầu

- Node.js 20+ và npm
- PostgreSQL 16
- Một database development riêng; integration tests phải dùng database test cô lập

### 1. Cấu hình môi trường

Các file cấu hình mẫu:

- Frontend: `client/.env.example`
- Backend: `server/.env.example`

Tạo `client/.env` và `server/.env` cục bộ, sau đó điền cấu hình tương ứng. Không commit `.env` hoặc chia sẻ database URL, JWT secret, Gmail App Password, OTP/security secret hay credential VNPAY.

Google Client ID phía frontend/backend phải khớp nhau. SMTP, Google OAuth và các provider khác chỉ hoạt động khi môi trường hiện tại có credential hợp lệ.

### 2. Backend và PostgreSQL

```powershell
Set-Location E:\project\shoe-store-webapp\server
npm ci
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npm run dev
```

Backend development chạy tại `http://localhost:5000`. Health endpoint:

```text
http://localhost:5000/api/health
```

Chỉ chạy seed trên database mới, đã xác minh đúng danh tính:

```powershell
npm run seed
```

Không dùng `prisma migrate reset`, `prisma db push` hoặc reseed trên database có dữ liệu cần giữ.

### 3. Frontend

Mở terminal khác:

```powershell
Set-Location E:\project\shoe-store-webapp\client
npm ci
npm run dev
```

Frontend development chạy tại `http://localhost:5173`. Vite proxy `/api` sang backend tại `http://localhost:5000`.

### 4. Kiểm tra chất lượng

Backend:

```powershell
Set-Location E:\project\shoe-store-webapp\server
npm run test:unit
npm run test:integration
```

Integration tests có thao tác dữ liệu. Chỉ chạy khi test environment trỏ tới database test cô lập, ví dụ `shoe_store_test`; tuyệt đối không trỏ tới `shoe_store_dev` hoặc database Docker demo.

Frontend:

```powershell
Set-Location E:\project\shoe-store-webapp\client
npm run lint
npm run build
```

## Chạy Docker local

Docker Compose gồm:

- `web`: Vite production build được Caddy phục vụ.
- `api`: Express/Prisma chạy bằng user không đặc quyền.
- `db`: PostgreSQL trên internal network, không public cổng 5432.
- `migrate`: tool profile để chạy `prisma migrate deploy` có kiểm soát.

### Cảnh báo release source

Không build image từ dirty `main` đang chứa B3 chưa nghiệm thu. Cho đến khi B3 hoàn tất, chỉ build/deploy từ worktree hoặc commit sạch chứa B1+B2 + Docker đã được kiểm tra. Docker build context có thể đưa source và migrations chưa duyệt vào image nếu quy tắc này bị bỏ qua.

### Khởi động an toàn

Từ source/worktree release sạch:

```powershell
docker compose -p steplab-docker-verify --env-file deploy/.env build
docker compose -p steplab-docker-verify --env-file deploy/.env up -d db
docker compose -p steplab-docker-verify --env-file deploy/.env --profile tools run --rm migrate npx prisma migrate status
docker compose -p steplab-docker-verify --env-file deploy/.env --profile tools run --rm migrate
docker compose -p steplab-docker-verify --env-file deploy/.env up -d api web
docker compose -p steplab-docker-verify --env-file deploy/.env ps
```

Instance local đã kiểm tra dùng:

- Website: `http://localhost:18080`
- Health API: `http://localhost:18080/api/health`
- Admin login: `http://localhost:18080/admin/login`

`postgres_data` và `uploads_data` là persistent volumes. Dừng ứng dụng mà không xóa dữ liệu:

```powershell
docker compose -p steplab-docker-verify --env-file deploy/.env stop web api
```

Không dùng `docker compose down --volumes` trừ khi owner chủ động phê duyệt xóa toàn bộ dữ liệu.

Quy trình migration, backup, restore verification, update và HTTPS được mô tả chi tiết tại [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quản trị Admin

### Docker local đã kiểm tra

- URL: `http://localhost:18080/admin/login`
- Email Admin local: `admin.ltw2026@gmail.com`
- Mật khẩu Admin local: `Adminltw2026`

Credential Docker local chỉ phục vụ môi trường Docker hiện tại, không được tái sử dụng làm credential production.

> **Cảnh báo:** README hiện chứa credential Docker local theo yêu cầu của owner để phục vụ đồ án cuối kỳ. Không công khai, chia sẻ hoặc commit/push README này khi credential còn tồn tại; phải xóa mật khẩu khỏi tài liệu trước khi repository được xuất bản.

### Đổi mật khẩu an toàn

1. Đăng nhập Admin bằng credential hiện tại.
2. Mở **Tài khoản quản trị**.
3. Chọn **Đổi mật khẩu của tôi**.
4. Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới trực tiếp trong form.
5. Sau khi đổi thành công, đăng nhập lại bằng mật khẩu mới.

Backend kiểm tra mật khẩu hiện tại, yêu cầu mật khẩu mới khác mật khẩu cũ, giới hạn 8–72 byte UTF-8 và hash bằng bcrypt. JWT Admin chứa fingerprint phụ thuộc password hash, vì vậy token cũ bị vô hiệu hóa sau khi đổi mật khẩu.

Ngoài credential Docker local được owner yêu cầu ghi rõ ở trên, không lưu mật khẩu khác vào README, source, command-line argument hoặc Git. Không tái sử dụng credential local cho production.

## Bảo mật và Hosting

- README hiện chứa credential Docker local và không được công khai/commit/push cho đến khi mật khẩu được xóa. `.env`, credential khác, database dump, backup và uploads runtime không được commit.
- Mỗi môi trường phải dùng database và bộ secret riêng; production không dùng `shoe_store_dev` hoặc database Docker local.
- Chỉ chạy migration production sau khi review SQL, backup và trial restore thành công.
- Domain production phải dùng HTTPS; Caddy có thể cấp/gia hạn certificate sau khi DNS và cổng 80/443 được cấu hình đúng.
- `APP_BASE_URL`, frontend origin, CORS/trust proxy và URL callback phải khớp domain HTTPS.
- Cập nhật Google OAuth Authorized JavaScript Origins cho domain production; frontend/backend phải dùng cùng Client ID.
- Cấu hình lại Gmail SMTP sender/App Password và các dịch vụ ngoài cho production; không sao chép secret từ development.
- PostgreSQL không public Internet; backup database và uploads phải được mã hóa, lưu ngoài máy chủ và kiểm tra restore định kỳ.
- B3 VNPAY chỉ được bật sau khi migration, credential Sandbox, chữ ký, IPN/Return và E2E provider được nghiệm thu.

Hosting public hiện **chưa được triển khai**.

## Trạng thái và lộ trình

| Hạng mục | Trạng thái |
|---|---|
| B1+B2 Auth, Email, OTP, COD | Hoàn thành và đã nghiệm thu |
| Storefront và Admin | Đang hoạt động |
| Docker local | Hoàn thành kiểm thử kỹ thuật |
| Docker catalog | Đã import 21 Products, 81 Colorways, 726 Variants và 318 Product Images |
| Docker Admin | Đã bootstrap và xác minh tài khoản local |
| Hosting public | Chưa triển khai |
| B3 VNPAY Sandbox | Có source/automated tests; tạm dừng, chưa nghiệm thu provider |
| B4 | Chưa triển khai |

## Tài liệu liên quan

- [Deployment guide](docs/DEPLOYMENT.md)
- [Database documentation](docs/DATABASE.md)
- [Đặc tả nghiệp vụ](docs/spec/)
- [Quy tắc làm việc](AGENTS.md)
