# STEP/LAB — Website Bán Giày Thể Thao Đa Thương Hiệu (Multi-brand Sneaker Store)

> **Đồ án học phần:** Lập trình Web  
> **Kiến trúc hệ thống:** Client - Server (RESTful API), kiến trúc cơ sở dữ liệu quan hệ PostgreSQL với Prisma ORM.

---

## 1. Giới thiệu tổng quan

**STEP/LAB** là nền tảng thương mại điện tử chuyên biệt cho các dòng giày thể thao và thời trang từ các thương hiệu hàng đầu thế giới (Nike, Adidas, Puma, New Balance, Converse). 

Dự án được xây dựng nhằm đáp ứng trải nghiệm mua sắm trực tuyến hiện đại với các yêu cầu đặc thù của ngành hàng giày dép: quản lý kích cỡ (size EU), biến thể màu sắc (colorway), bộ sưu tập hình ảnh chi tiết theo từng góc độ, quản lý vòng đời đơn hàng và hệ thống đánh giá sản phẩm có xác thực mua hàng.

---

## 2. Công nghệ sử dụng (Technology Stack)

### Frontend (`/client`)
- **Framework & Build Tool:** [React 19](https://react.dev/), [Vite](https://vite.dev/)
- **Routing:** [React Router DOM v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Linter:** [Oxlint](https://oxc.rs/)

### Backend (`/server`)
- **Runtime & Framework:** [Node.js](https://nodejs.org/) (ES Modules), [Express.js](https://expressjs.com/)
- **Kiến trúc mã nguồn:** Phân tầng rõ ràng (`routes` -> `controllers` -> `services` -> `middlewares` -> `config`)
- **Xử lý lỗi:** Centralized Error Handling, chuẩn hóa mã lỗi HTTP và JSON error response

### Cơ sở dữ liệu & ORM
- **Hệ quản trị CSDL:** [PostgreSQL 16](https://www.postgresql.org/)
- **ORM:** [Prisma ORM 7](https://www.prisma.io/) (`@prisma/client`, `@prisma/adapter-pg`, driver `pg`)
- **Toàn vẹn tiền tệ:** Sử dụng kiểu số học chính xác `NUMERIC(12, 0)` cho giá trị tiền tệ (VND)

### Xác thực & Bảo mật (Authentication & Security)
- **Cơ chế:** JSON Web Token (JWT) lưu tại Client qua cơ chế Bearer Token
- **Bảo mật mật khẩu:** `bcryptjs` hashing
- **Middleware:** `requireMember` (bắt buộc xác thực) và `strictOptionalMember` (xác thực tùy chọn nhưng nghiêm ngặt định danh)

### Testing
- **Backend Testing:** Node.js Native Test Runner (`node --test`), kiểm thử tích hợp (Integration Tests) cho luồng Auth, Orders và Reviews.

---

## 3. Các chức năng chính (Core Features)

### 3.1. Danh mục & Trải nghiệm sản phẩm (Catalog & Storefront)
- **5 Thương hiệu chính hãng:** Nike, Adidas, Puma, New Balance, Converse.
- **4 Phân loại phong cách:** Lifestyle, Running, Streetwear, Classic.
- **Bộ lọc đa chiều:**
  - Lọc theo thương hiệu và phân loại.
  - Lọc theo kích cỡ giày (chuẩn EU từ 36 đến 44).
  - Lọc theo phổ màu sắc (Black, White, Grey, Blue, Red, Beige, Green...).
  - Lọc theo khoảng giá linh hoạt và trạng thái còn hàng.
- **6 Chế độ sắp xếp:** Mới nhất, Cũ nhất, Giá tăng dần, Giá giảm dần, Tên A-Z, Tên Z-A.
- **Trang chi tiết sản phẩm (Product Detail Page):**
  - Chuyển đổi linh hoạt giữa các phối màu (Colorways).
  - Thư viện ảnh chi tiết chất lượng cao theo từng phối màu.
  - Chọn size thời gian thực dựa trên tồn kho thực tế (`stock`).
  - Hiển thị điểm đánh giá sao trung bình và số lượng nhận xét đã xác thực.

### 3.2. Giỏ hàng & Mua sắm (Shopping Cart)
- Quản lý giỏ hàng phía Client bền vững (lưu trữ tại `localStorage`).
- Thêm sản phẩm theo đúng biến thể cụ thể (Mã sản phẩm + Colorway + Size).
- Cập nhật số lượng, tự động kiểm tra số lượng tồn kho khả dụng tối đa.
- Tính toán tạm tính và đồng bộ giỏ hàng theo thời gian thực.

### 3.3. Đặt hàng & Vòng đời đơn hàng (Checkout & Orders)
- **Hỗ trợ 2 đối tượng:** Khách vãng lai (Guest) và Thành viên đã đăng nhập (Member).
- **Phương thức thanh toán:** COD (Thanh toán khi nhận hàng).
- **Phí giao hàng:** Cố định 30.000 VNĐ toàn quốc theo quy tắc nghiệp vụ.
- **API Báo giá tự động:** `/api/checkout/quote` xác thực giá trị tiền hàng, phí ship và tổng tiền.
- **Mã đơn hàng chuẩn hóa:** Sinh mã tự động dạng `ORD-XXXXXX`.
- **Tra cứu đơn hàng công khai (`/order-lookup`):** Khách hàng tra cứu nhanh tiến độ đơn chỉ với Mã đơn hàng + Số điện thoại nhận hàng.
- **Quy tắc vòng đời đơn hàng:**
  - Hủy đơn hàng: Chỉ cho phép hủy khi đơn ở trạng thái `PENDING` (Chờ xử lý).
  - Xác nhận đã nhận hàng: Cho phép xác nhận khi đơn chuyển sang trạng thái `DELIVERED` để hoàn tất thành `COMPLETED`.

### 3.4. Tài khoản thành viên (Member Management)
- Đăng ký tài khoản, Đăng nhập và tự động duy trì phiên làm việc qua JWT.
- Trang thông tin tài khoản (`/account`): Cập nhật họ tên, số điện thoại, địa chỉ nhận hàng mặc định (tự động điền khi thanh toán).
- Đổi mật khẩu bảo mật (`/account/change-password`).
- Quên mật khẩu (`/forgot-password`).
- Quản lý lịch sử đơn hàng (`/account/orders`): Theo dõi danh sách và xem chi tiết tiến độ từng đơn hàng của tài khoản.

### 3.5. Đánh giá sản phẩm đã xác thực (Verified Product Reviews)
- **Quy tắc chống gian lận:** Chỉ những thành viên đã từng mua sản phẩm và đơn hàng đã giao thành công (`DELIVERED` hoặc `COMPLETED`) mới có quyền gửi đánh giá.
- Mỗi thành viên chỉ đánh giá 1 lần cho mỗi mẫu sản phẩm đã mua (có quyền cập nhật đánh giá đã viết).
- Đánh giá từ 1 đến 5 sao, kèm tiêu đề và nội dung cảm nhận chi tiết.
- Bộ lọc đánh giá theo số sao (Tất cả, 5 sao, 4 sao, 3 sao, 2 sao, 1 sao) và thống kê tỷ lệ phân bổ sao.

---

## 4. Cấu trúc thư mục (Project Structure)

```text
shoe-store-webapp/
├── client/                     # Mã nguồn ứng dụng Frontend (React + Vite)
│   ├── public/                 # Tài nguyên tĩnh công khai (ảnh, icons)
│   ├── src/
│   │   ├── components/         # Các UI component (layout, catalog, product-detail, auth...)
│   │   ├── context/            # Context quản lý trạng thái (AuthContext...)
│   │   ├── data/               # Dữ liệu tĩnh và cấu hình catalog
│   │   ├── pages/              # Các trang của ứng dụng (Home, Products, Checkout, Account...)
│   │   ├── services/           # Các tầng gọi API Backend (auth, order, review, catalog...)
│   │   ├── utils/              # Tiện ích định dạng tiền tệ, ngày tháng...
│   │   ├── App.jsx             # Cấu hình Routing của toàn bộ ứng dụng
│   │   └── main.jsx            # Entry point của React
│   ├── package.json
│   └── vite.config.js          # Cấu hình Vite & Proxy API sang port 5000
│
├── server/                     # Mã nguồn ứng dụng Backend (Node.js + Express)
│   ├── prisma/
│   │   ├── migrations/         # Lịch sử các bản migration cơ sở dữ liệu
│   │   ├── schema.prisma       # Định nghĩa Schema PostgreSQL và quan hệ bảng
│   │   ├── seed.js             # Kịch bản nạp dữ liệu mẫu ban đầu (Catalog Seed)
│   │   └── verify.js           # Kịch bản kiểm tra tính toàn vẹn dữ liệu
│   ├── src/
│   │   ├── config/             # Cấu hình môi trường và kết nối Prisma Client
│   │   ├── controllers/        # Điều hướng yêu cầu HTTP (Auth, Order, Review, Health)
│   │   ├── middlewares/        # Middlewares xác thực JWT, kiểm tra quyền, xử lý lỗi
│   │   ├── routes/             # Khai báo các Endpoint REST API
│   │   ├── services/           # Xử lý nghiệp vụ (Business Logic) và giao tiếp DB
│   │   ├── app.js              # Khởi tạo Express App và cấu hình CORS, JSON parser
│   │   └── server.js           # Entry point khởi động HTTP Server
│   ├── test/                   # Các bài kiểm thử tích hợp (Integration Tests)
│   ├── .env.example            # Biến môi trường mẫu cho server
│   └── package.json
│
├── docs/                       # Tài liệu kỹ thuật và đặc tả nghiệp vụ
│   ├── DATABASE.md             # Tài liệu chi tiết 13 bảng CSDL, quan hệ và chỉ mục
│   └── spec/                   # Tài liệu đặc tả nghiệp vụ chi tiết của đồ án
├── resources/                  # Tài nguyên thiết kế, hình ảnh sản phẩm gốc
├── AGENTS.md                   # Bộ quy chuẩn phát triển và ràng buộc nghiệp vụ
└── README.md                   # Hướng dẫn dự án và cách chạy ứng dụng
```

---

## 5. Yêu cầu môi trường (Prerequisites)

Trước khi tiến hành cài đặt, hãy đảm bảo máy tính đã cài đặt các phần mềm sau:
- **Node.js**: Phiên bản 18.x hoặc 20.x LTS trở lên (khuyến nghị Node 20+).
- **npm**: Đi kèm với Node.js.
- **PostgreSQL**: Phiên bản 16 (chạy cài đặt trực tiếp trên hệ điều hành hoặc qua Docker).

---

## 6. Hướng dẫn cài đặt và khởi chạy (Getting Started)

### Bước 1: Chuẩn bị môi trường Backend

Mở terminal và di chuyển vào thư mục `server`:

```bash
cd server
```

1. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```

2. Tạo file cấu hình môi trường `.env`:
   Tạo file `.env` tại thư mục `server/` (sao chép từ `.env.example` hoặc tạo mới) với nội dung:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shoe_store_dev?schema=public"
   SHIPPING_FEE=30000
   JWT_MEMBER_SECRET="your-super-secret-jwt-key-step-lab-2026"
   JWT_MEMBER_EXPIRES_IN=8h
   ```
   > *Lưu ý:* Hãy điều chỉnh `postgres:postgres@localhost:5432/shoe_store_dev` cho khớp với tài khoản, mật khẩu và tên CSDL PostgreSQL của bạn. Đảm bảo CSDL `shoe_store_dev` đã được tạo trong PostgreSQL.

### Bước 2: Khởi tạo Cơ sở dữ liệu và nạp dữ liệu mẫu (Seed Data)

Vẫn tại thư mục `server`:

1. Chạy các bản migration để khởi tạo 13 bảng dữ liệu:
   ```bash
   npx prisma migrate dev
   ```
   *(Trong môi trường production/CI, sử dụng lệnh: `npx prisma migrate deploy`)*

2. Nạp dữ liệu mẫu chuẩn hóa vào CSDL (gồm 5 thương hiệu, 4 danh mục, 20 sản phẩm, 80 phối màu, 314 ảnh, 720 biến thể tồn kho):
   ```bash
   npm run seed
   ```

3. (Tùy chọn) Kiểm tra tính toàn vẹn của dữ liệu vừa nạp:
   ```bash
   node prisma/verify.js
   ```

### Bước 3: Khởi chạy Backend Server

Khởi động server backend ở chế độ phát triển (tự động reload khi sửa code với `nodemon`):

```bash
npm run dev
```

Server sẽ lắng nghe tại: `http://localhost:5000`  
Bạn có thể kiểm tra trạng thái hoạt động qua API Health check: `http://localhost:5000/api/health`

---

### Bước 4: Chuẩn bị và khởi chạy Frontend Client

Mở một cửa sổ terminal mới và di chuyển vào thư mục `client`:

```bash
cd client
```

1. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```

2. Khởi chạy giao diện Frontend:
   ```bash
   npm run dev
   ```

3. Mở trình duyệt web và truy cập vào địa chỉ:
   ```text
   http://localhost:5173
   ```

> *Ghi chú cấu hình Proxy:* Trong `vite.config.js`, toàn bộ request có tiền tố `/api` từ giao diện sẽ được tự động proxy chuyển tiếp tới `http://localhost:5000`, đảm bảo kết nối mượt mà và không gặp vấn đề về CORS khi phát triển ở local.

---

## 7. Kiểm thử và Kiểm tra chất lượng (Testing & Linting)

### Kiểm thử Backend (Tích hợp API)
Tại thư mục `server`:
```bash
cd server
npm test
```
Bộ kiểm thử tích hợp sử dụng trình chạy native test của Node.js để kiểm thử toàn diện:
- Xác thực đăng ký, đăng nhập, đổi mật khẩu và quản lý hồ sơ (`auth.integration.test.js`).
- Vòng đời tạo đơn, tra cứu đơn và quản lý đơn hàng thành viên (`order.member.integration.test.js`).
- Quy tắc điều kiện và phân trang đánh giá sản phẩm (`review.integration.test.js`).

### Kiểm tra cú pháp Frontend
Tại thư mục `client`:
```bash
cd client
npm run lint
```
Sử dụng Oxlint để kiểm tra tĩnh chất lượng mã nguồn React.

---

## 8. Tài liệu kỹ thuật liên quan

- **Tài liệu Cơ sở dữ liệu chi tiết:** Xem tại [docs/DATABASE.md](docs/DATABASE.md) (mô tả chi tiết 13 bảng nghiệp vụ, Data Dictionary, khóa ngoại, chỉ mục hiệu năng và ràng buộc toàn vẹn).
- **Quy chuẩn phát triển & Ràng buộc kiến trúc:** Xem tại [AGENTS.md](AGENTS.md).
- **Tài liệu Đặc tả nghiệp vụ gốc:** Xem tại thư mục `docs/spec/`.