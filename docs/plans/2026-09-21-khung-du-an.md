# Kế hoạch: Dựng khung dự án

- Ngày: 2026-09-21
- Trạng thái: Đang làm — Chặng B

## Mục tiêu

Dựng khung chạy được cho website bán giày gồm React/Vite, Express và PostgreSQL trong đúng ba dịch vụ Docker Compose. Áp dụng schema P1 đã duyệt, có seed idempotent, kiểm thử nền tảng, API kiểm tra sức khỏe và trang chủ trắng để xác nhận toàn hệ thống khởi động được bằng một lệnh.

Plan được thực hiện theo hai chặng có thể dừng độc lập nhưng vẫn nằm trong cùng một plan:

- Chặng A: Docker + backend + PostgreSQL + migration + seed.
- Chặng B: frontend + kiểm tra tích hợp toàn hệ thống + cập nhật tài liệu.

## Phạm vi

- Làm:
  - Dùng JavaScript ESM và npm cho cả backend/frontend; runtime Docker dùng Node.js 24 LTS.
  - Tạo cấu trúc backend theo lớp route → controller → service → truy cập DB.
  - Tạo cấu trúc frontend React/Vite tối thiểu, cấu hình sẵn Tailwind CSS v4, trang `/` nền trắng và không có nội dung nghiệp vụ.
  - Tạo `docker-compose.yml` đúng ba dịch vụ: `frontend`, `backend`, `db`.
  - Dùng PostgreSQL 18 và bật extension `pg_trgm` trong migration.
  - Gắn named volume cho dữ liệu PostgreSQL và thư mục ảnh upload.
  - Tạo `.env.example` chỉ chứa giá trị giả/phát triển; `.env` nằm trong `.gitignore`.
  - Chọn `pg` để truy vấn tham số hóa và `node-pg-migrate` để quản lý migration.
  - Tạo migration P1 theo `docs/schema.md`, gồm 14 bảng P1, constraint/index/trigger đã duyệt; không tạo bảng `reviews`.
  - Tạo seed idempotent theo `DP-03`: admin, danh mục/thuộc tính, khoảng 20 sản phẩm có ảnh/biến thể, Customer và đơn ở đủ 6 trạng thái; không seed đánh giá.
  - Tạo `GET /api/health`, kiểm tra được cả Express và kết nối PostgreSQL/`pg_trgm`.
  - Thiết lập lint, test backend/frontend và các script trong `package.json`.
  - Cập nhật `README.md` và các mục 2, 7, 8 của `AGENTS.md` sau khi công cụ đã được cài và lệnh đã chạy thật.
- Không làm (để sau):
  - API nghiệp vụ sản phẩm, giỏ hàng, tài khoản, xác thực, đơn hàng, thống kê.
  - Giao diện bán hàng/quản trị, router nhiều trang, state management hoặc thư viện component UI; Tailwind CSS v4 chỉ được cấu hình sẵn, chưa dùng để dựng giao diện.
  - Upload ảnh qua API; plan này chỉ tạo thư mục/volume và ảnh placeholder dành cho seed.
  - JWT, phân quyền, checkout, trừ/hoàn kho và chuyển trạng thái qua API.
  - P2: bảng/seed/API đánh giá và job tự động hoàn thành sau 168 giờ.
  - Triển khai VPS, HTTPS, reverse proxy production ngoài frontend Nginx.
  - Chạy migration down, drop database/volume hoặc xóa dữ liệu hiện có.

## Quy tắc nghiệp vụ liên quan

- Phạm vi và dữ liệu: `SP-01` đến `SP-14`, `DH-01` đến `DH-07`, `KHO-01`, `KHO-05`, `KHO-06`, `TT-02`, `TKH-01` đến `TKH-03`, `TKH-07`.
- Thống kê/seed hợp lệ: `TK-01` đến `TK-04`, mục 5.1–5.3 về 6 trạng thái đơn.
- Bảo mật nền tảng: `NF-01` đến `NF-06`.
- Hiệu năng/schema: `NF-07`, `NF-09`, `TK-03`.
- Docker/seed: `DP-01` đến `DP-04`.
- Nguồn schema: toàn bộ `docs/schema.md` đã duyệt, riêng bảng `reviews` thuộc P2 bị loại khỏi migration này.

Lưu ý phạm vi test: `NF-09` yêu cầu test logic checkout, đồng thời tồn kho, trạng thái và doanh thu. Plan này chưa tạo các service nghiệp vụ đó; chỉ test constraint/schema/seed. Test logic đầy đủ sẽ nằm trong plan của từng chức năng tương ứng.

## Lựa chọn công nghệ

### Runtime và database

- Node.js 24 LTS cho backend, bước build frontend và môi trường phát triển. Node 24 đang là LTS và được hỗ trợ đến tháng 4/2028 theo [lịch phát hành Node.js](https://nodejs.org/en/about/previous-releases).
- PostgreSQL `18-alpine`. PostgreSQL 18 là major hiện hành ổn định; image `postgres:18-alpine` có trên Docker Hub. Migration chạy `CREATE EXTENSION IF NOT EXISTS pg_trgm`; tài liệu PostgreSQL xác nhận `pg_trgm` cung cấp GIN/GiST operator class cho tìm kiếm trigram ([PostgreSQL 18](https://www.postgresql.org/docs/18/gin.html), [Docker image](https://hub.docker.com/_/postgres/tags?page=1)).
- Frontend Docker dùng multi-stage build: Node 24 build Vite, Nginx phục vụ static build. Chạy local ngoài Docker vẫn dùng `npm run dev`.

### So sánh công cụ migration và truy vấn database

Số liệu phổ biến là lượt tải npm/tuần quan sát ngày 2026-09-21, chỉ dùng làm tín hiệu tương đối vì thay đổi theo thời gian.

| Phương án | `CHECK`, partial/expression index, trigger, `DEFERRABLE` bằng SQL thuần | Dễ dùng cho người mới | Độ phổ biến | Nhận xét |
|---|---|---|---|---|
| **`pg` + `node-pg-migrate`** | **Đầy đủ.** `node-pg-migrate` hỗ trợ check/deferrable constraint, partial/GIN index, function/trigger và `pgm.sql()` cho SQL thuần; migration mặc định chạy transaction và có advisory lock. | Trung bình: phải học SQL và transaction, nhưng chỉ có một mô hình dữ liệu đúng với PostgreSQL. Query bằng `$1`, `$2` rõ ràng, dễ thấy SQL thực tế. | `pg` rất cao, khoảng 29 triệu/tuần; `node-pg-migrate` khoảng 0,59 triệu/tuần. | Ít abstraction, bám sát schema đã duyệt; phù hợp yêu cầu học lập trình web và PostgreSQL. |
| **Knex + `pg`** | Tốt. Schema builder có check, partial index và deferrable unique/FK; `knex.schema.raw()`/`knex.raw()` xử lý expression index, trigger và SQL đặc thù. | Khá dễ cho CRUD; khó hơn khi phải hiểu đồng thời query builder và raw SQL cho schema nâng cao. | Cao, khoảng 4,9 triệu/tuần. | Gọn cho truy vấn động nhưng thêm một lớp abstraction không cần thiết ở quy mô này. |
| **Prisma Client + Prisma Migrate** | Có thể sửa migration SQL thủ công, nhưng `CHECK`, expression index và trigger không được biểu diễn đầy đủ trong mô hình Prisma; phải duy trì Prisma schema cùng SQL tùy chỉnh. | Dễ nhất cho CRUD/quan hệ cơ bản; khó hơn khi migration sinh tự động không phản ánh toàn bộ schema PostgreSQL. | Rất cao, `@prisma/client` khoảng 16 triệu/tuần. | Type-safe tốt nếu dùng TypeScript, nhưng không phù hợp mục tiêu JavaScript đơn giản và schema PostgreSQL giàu constraint. |

Nguồn đối chiếu:

- `node-postgres` hỗ trợ truy vấn tham số hóa, tránh nối chuỗi dữ liệu đầu vào: [node-postgres Queries](https://node-postgres.com/features/queries).
- `node-pg-migrate`: [constraint/DEFERRABLE](https://salsita.github.io/node-pg-migrate/migrations/constraints), [partial/GIN index](https://salsita.github.io/node-pg-migrate/migrations/indexes), [trigger](https://salsita.github.io/node-pg-migrate/migrations/triggers), [SQL thuần](https://salsita.github.io/node-pg-migrate/migrations/misc).
- Knex: [schema builder](https://knexjs.org/guide/schema-builder.html), [raw SQL](https://knexjs.org/guide/raw), [transaction](https://knexjs.org/guide/transactions).
- Prisma: [ma trận tính năng database](https://docs.prisma.io/docs/orm/v7/reference/database-features), [tùy chỉnh migration cho tính năng chưa biểu diễn được](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features).
- Mức phổ biến: [pg](https://www.npmjs.com/package/pg), [node-pg-migrate](https://www.npmjs.com/package/node-pg-migrate), [Knex](https://www.npmjs.com/package/knex), [Prisma Client](https://www.npmjs.com/package/@prisma/client).

**Đề xuất:** chọn `pg` + `node-pg-migrate`.

Lý do:

1. `docs/schema.md` đã là nguồn sự thật chi tiết và dùng nhiều tính năng PostgreSQL; raw SQL thể hiện chính xác nhất, không sinh chênh lệch giữa ORM model và database.
2. `pg` bắt buộc tham số hóa mọi giá trị đầu vào, phù hợp `NF-02`; transaction dùng một client lấy từ pool.
3. `node-pg-migrate` chỉ quản lý thứ tự/lịch sử/transaction migration; DDL nâng cao vẫn đọc được như SQL chuẩn.
4. Ít dependency và ít abstraction hơn Knex/Prisma, phù hợp quy mô đồ án.
5. Nhược điểm là phải viết SQL rõ ràng; đây cũng là lợi ích học tập và giúp review các constraint tiền/kho/trạng thái trực tiếp.

### Cách truy vấn database

- Một `pg.Pool` dùng chung trong process, cấu hình từ `DATABASE_URL` đã được Zod validate.
- Repository/data-access nhận `pool` hoặc transaction `client`; controller/route không viết SQL.
- Mọi giá trị dùng placeholder `$1`, `$2`, không nối chuỗi SQL.
- Identifier/sort field động chỉ lấy từ allowlist cố định trong code, không nhận trực tiếp từ client.
- Helper `withTransaction(callback)` lấy một client, `BEGIN`, `COMMIT`/`ROLLBACK`, và luôn `release()` trong `finally`.
- Health check dùng `SELECT 1` và kiểm tra `pg_extension` có `pg_trgm`; không trả version, connection string hay lỗi SQL ra response.

### Thư viện backend

| Mục đích | Lựa chọn | Lý do |
|---|---|---|
| HTTP | `express` | Stack đã chốt |
| Database | `pg` | PostgreSQL native, pool/transaction rõ, query tham số hóa |
| Migration | `node-pg-migrate` (dev dependency) | Bám SQL thuần và hỗ trợ tính năng schema đã duyệt |
| Validate | `zod` | Dùng được với JavaScript, không dependency, schema ngắn gọn; dùng cho env và request sau này ([Zod](https://zod.dev/)) |
| Mật khẩu | `argon2` | Argon2id mặc định, tự tạo salt và có API hash/verify; có binary cho Alpine, hỗ trợ Node 22+ ([node-argon2](https://github.com/ranisalt/node-argon2)) |
| Test runner | `vitest` | Dùng chung runner với frontend, API gần Jest, hỗ trợ coverage V8 ([Vitest](https://main.vitest.dev/)) |
| HTTP integration test | `supertest` | Test trực tiếp Express app, không cần mở port; assert status/header/body ([Supertest](https://github.com/forwardemail/supertest)) |
| Security nền | `helmet`, `cors`, `express-rate-limit` | Header bảo mật, CORS theo env, rate limit mặc định `NF-04` |
| Lint | `eslint` | Cung cấp `npm run lint`; không thêm formatter riêng ở bước khung |

Không cài JWT, Multer, mail, thanh toán hoặc ORM trong plan này.

### Thư viện frontend

| Mục đích | Lựa chọn | Lý do |
|---|---|---|
| UI runtime | `react`, `react-dom` | Stack đã chốt |
| Build/dev | `vite`, `@vitejs/plugin-react` | Stack đã chốt |
| UI/CSS | `tailwindcss`, `@tailwindcss/vite` | Tailwind CSS v4 với plugin chính thức cho Vite; import Tailwind trực tiếp trong CSS, không cần cấu hình PostCSS riêng |
| Test runner | `vitest`, `jsdom` | Đồng bộ backend, tích hợp Vite |
| Component test | `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` | Test theo hành vi người dùng/DOM thay vì implementation detail ([React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)) |
| Lint | `eslint`, plugin React/hooks/refresh | Cung cấp `npm run lint` |

Không cài React Router, Axios, state manager hoặc bộ component UI khi mới chỉ có một trang trắng. Tailwind CSS v4 chỉ được chuẩn bị ở mức build/CSS; trang chủ chưa dùng class Tailwind nào. API sau này dùng `fetch` trừ khi plan chức năng chứng minh cần dependency khác.

## Cấu trúc thư mục dự kiến

Chỉ tạo file/thư mục có sử dụng thực tế; không tạo file rỗng hoặc code placeholder không được gọi.

```text
shoe-store-webapp/
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── AGENTS.md
├── docs/
│   ├── nghiep-vu.md
│   ├── schema.md
│   └── plans/
│       └── 2026-09-21-khung-du-an.md
├── backend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── vitest.config.js
│   ├── migrations/
│   │   ├── 001_enable_pg_trgm.js
│   │   ├── 002_create_p1_schema.js
│   │   └── 003_create_p1_indexes_and_triggers.js
│   ├── seeds/
│   │   ├── assets/
│   │   │   └── sample-shoe.webp
│   │   ├── data.js
│   │   └── seed.js
│   ├── scripts/
│   │   └── prepare-test-database.js
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   └── env.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   └── health.routes.js
│   │   ├── controllers/
│   │   │   └── health.controller.js
│   │   ├── services/
│   │   │   └── health.service.js
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   ├── transaction.js
│   │   │   └── health.repository.js
│   │   └── middlewares/
│   │       ├── error-handler.js
│   │       ├── not-found.js
│   │       └── rate-limit.js
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── health.test.js
│   │   │   ├── schema.test.js
│   │   │   └── seed.test.js
│   │   └── setup/
│   │       └── database.js
│   └── uploads/
│       └── .gitkeep
└── frontend/
    ├── .dockerignore
    ├── Dockerfile
    ├── eslint.config.js
    ├── index.html
    ├── nginx.conf
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── vitest.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── pages/
        │   └── HomePage.jsx
        ├── styles/
        │   └── global.css
        └── tests/
            ├── HomePage.test.jsx
            └── setup.js
```

Các thư mục `components/`, `api/`, `hooks/` phía frontend và các module nghiệp vụ phía backend chỉ được tạo trong plan chức năng đầu tiên cần chúng, tránh thư mục/code chết.

## Docker Compose và biến môi trường

### Ba dịch vụ

1. `db`
   - Image `postgres:18-alpine`.
   - Named volume `postgres_data` gắn đúng data directory của image.
   - Healthcheck bằng `pg_isready`.
   - Chỉ dùng tài khoản/database phát triển từ biến môi trường.
2. `backend`
   - Build từ `backend/Dockerfile` trên Node 24 LTS.
   - Chờ `db` đạt `service_healthy`; Docker Compose hỗ trợ điều kiện này theo [tài liệu startup order](https://docs.docker.com/compose/how-tos/startup-order/).
   - Gắn named volume `uploaded_images:/app/uploads`.
   - Khi khởi động local: chạy migration; chạy seed nếu `RUN_SEED=true`; sau đó chạy server.
   - Healthcheck gọi `GET /api/health` bằng Node, không thêm curl vào image.
3. `frontend`
   - Multi-stage build Vite bằng Node 24, phục vụ `dist/` bằng Nginx.
   - Chờ backend healthy để `docker compose up --build` phản ánh hệ thống đầy đủ.
   - Public port mặc định `5173`, container port `80`.

Named volumes:

- `postgres_data`: dữ liệu PostgreSQL, không mất khi `docker compose down` thông thường.
- `uploaded_images`: ảnh upload/ảnh placeholder seed, không commit ảnh người dùng.

### `.env.example`

Liệt kê tối thiểu:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- `DATABASE_URL`, `TEST_DATABASE_URL`.
- `BACKEND_PORT`, `FRONTEND_PORT`, `CORS_ORIGIN`.
- `SHIPPING_FEE_VND=30000`.
- `RUN_SEED=true` cho môi trường local.
- `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` với giá trị giả dành cho phát triển.
- `UPLOAD_DIR=/app/uploads`.
- Các ngưỡng rate limit theo `NF-04`.

`docker compose up --build` phải chạy được ngay với default phát triển không bí mật; `.env` là tùy chọn override và bị ignore. Trước triển khai thật phải đặt password/JWT secret bằng secret manager hoặc biến môi trường thật; plan này chưa dùng JWT.

## Ảnh hưởng đến database

### Migration P1

Tạo mới:

- Extension: `pg_trgm`.
- 14 bảng P1: `admin_accounts`, `customers`, `categories`, `brands`, `sizes`, `colors`, `products`, `product_images`, `product_variants`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`.
- Toàn bộ PK/FK, `CHECK`, unique/unique expression index, partial index, GIN trigram index và index thường trong `docs/schema.md`.
- Constraint `UNIQUE (product_id, position) DEFERRABLE INITIALLY DEFERRED` của `product_images`.
- Trigger/function chặn thay đổi `products.slug` sau insert theo `SP-12`.
- Migration history do `node-pg-migrate` quản lý.

Không tạo:

- Bảng `reviews`, index/FK review hoặc dữ liệu review.
- Payment status, promotion, shipment provider hay bảng ngoài schema đã duyệt.

Nguyên tắc migration:

- File migration chỉ tiến về trước; sau khi đã chạy không sửa/xóa.
- DDL nâng cao viết rõ bằng SQL thuần qua `pgm.sql()`; công cụ chịu trách nhiệm lịch sử, advisory lock và transaction.
- Migration không seed dữ liệu nghiệp vụ; seed là script riêng.
- Có khai báo `down` để tài liệu hóa chiều đảo cho môi trường local/test, nhưng không tự chạy `down` và không drop dữ liệu/volume trong quá trình thực hiện plan.
- Test dùng database có hậu tố `_test`; script phải từ chối chạy thao tác reset nếu URL không kết thúc bằng `_test`.

### Seed `DP-03`

- Một admin từ `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`, password hash Argon2id; không hardcode hash/password thật.
- Một số category, brand, size, color.
- Khoảng 20 sản phẩm, mỗi sản phẩm có ít nhất một variant và một bản ghi ảnh; giá/tồn kho/slug/check đúng schema.
- Một file WebP placeholder nhỏ trong `seeds/assets`; seed sao chép thành các tên ổn định khác nhau vào volume upload để thỏa unique `image_path`. Không dùng ảnh thật của người dùng.
- Một số Customer với mật khẩu phát triển được hash.
- Đơn Guest và Customer ở đủ 6 trạng thái, item snapshot đầy đủ, tổng tiền đúng, history có bản ghi từ NULL lúc tạo và các bước hợp lệ.
- Đơn `completed` có `completed_at`; đơn `cancelled` có history hợp lệ; dữ liệu tồn kho cuối cùng nhất quán với seed.
- Không có review.
- Idempotent: dùng natural key/unique key ổn định và upsert có kiểm soát; order/item/history chỉ tạo khi order seed chưa tồn tại; chạy lại không nhân bản và không trừ/hoàn kho lần nữa.

## API và frontend tối thiểu

### `GET /api/health`

- Thành công: HTTP 200, JSON tối thiểu `{ "status": "ok", "database": "ok" }`.
- Service truy vấn `SELECT 1` và xác nhận extension `pg_trgm` tồn tại.
- Khi DB chưa sẵn sàng: HTTP 503 theo format lỗi thống nhất, không trả stack trace/SQL/credential.
- Route → controller → service → repository đầy đủ để làm mẫu kiến trúc.
- Có Supertest cho cả 200 và 503 bằng dependency injection/mock repository; có integration test với PostgreSQL thật cho 200.

### Trang chủ frontend

- `/` render một `main` rỗng trên nền trắng, không header, chữ, nút hoặc dữ liệu mẫu.
- `vite.config.js` dùng plugin `@tailwindcss/vite`; `frontend/src/styles/global.css` import Tailwind bằng `@import "tailwindcss";`, không có cấu hình PostCSS riêng.
- Trang chủ chưa dùng class Tailwind; màu nền trắng vẫn được đặt bằng CSS tối thiểu để giữ đúng phạm vi khung.
- Có title cơ bản “Cửa hàng giày” theo `NF-10` dù nội dung trang trắng.
- Không gọi API, không tạo loading giả hoặc code chưa dùng.
- Có test render thành công và không có nội dung hiển thị; `npm run build` phải xanh.

## Các file sẽ tạo/sửa

- Tạo toàn bộ file trong cây thư mục ở mục “Cấu trúc thư mục dự kiến”.
- `docker-compose.yml`: ba dịch vụ, healthcheck, dependency, port và named volumes.
- `.env.example`: biến phát triển giả; không chứa secret thật.
- `.gitignore`: ignore `.env`, dependency/build/coverage và nội dung `backend/uploads/*` trừ `.gitkeep`.
- `README.md`: yêu cầu hệ thống, lệnh chạy/test/migrate/seed và URL kiểm tra.
- `AGENTS.md`: chỉ cập nhật sau khi công cụ/lệnh đã được kiểm chứng, chi tiết ở mục dưới.
- `docs/plans/2026-09-21-khung-du-an.md`: tick từng bước và điền kết quả sau khi làm.

## Phần `AGENTS.md` sẽ cập nhật sau khi plan được duyệt

- **Mục 2 — Stack đã chốt:**
  - Database access: `pg`.
  - Migration: `node-pg-migrate`, migration nâng cao dùng SQL thuần.
  - Test backend: Vitest + Supertest.
  - Test frontend: Vitest + React Testing Library + jsdom.
  - Password hashing: `argon2` (Argon2id).
  - Validation: Zod.
  - Runtime/image: Node 24 LTS, PostgreSQL 18.
  - UI/CSS: Tailwind CSS v4 qua `@tailwindcss/vite`; khung cài và cấu hình sẵn nhưng chưa dùng class Tailwind để dựng giao diện.
- **Mục 7 — Cấu trúc thư mục:** thay cây “dự kiến” bằng cây thực tế đã tạo, gồm Dockerfile, migrations, seeds, tests và frontend test setup.
- **Mục 8 — Lệnh thường dùng:** xác nhận các lệnh đã chạy thật; bổ sung `npm start`, `npm run test:coverage`, lệnh migration status/create nếu thực tế cần, và URL/port mặc định.

Không cập nhật các mục khác của `AGENTS.md` trong plan này.

## Các bước thực hiện

### Chặng A — Docker, backend và database

- [x] **Bước 1: Khởi tạo cấu hình gốc và backend tối thiểu.**
  - Tạo `.gitignore`, `.dockerignore`, `.env.example`, backend package/ESLint/Vitest.
  - Cài đúng dependency đã duyệt và commit lockfile.
  - Tạo config env bằng Zod, Express app/server, middleware lỗi/CORS/rate limit.
  - Tạo `GET /api/health` theo đủ lớp và test unit/Supertest.
  - Chạy `npm test` và `npm run lint` trong backend.
  - Commit đề xuất: `feat: scaffold backend health service`.
- [x] **Bước 2: Tạo PostgreSQL và migration P1.**
  - Tạo ba migration theo schema đã duyệt, tuyệt đối không có `reviews`.
  - Bật `pg_trgm`; tạo constraint/index/trigger chính xác.
  - Tạo test database được guard bằng hậu tố `_test`; chạy migration lên database test sạch.
  - Test cấu trúc bảng, extension, constraint tiền/tồn kho, order code, FK RESTRICT, deferred image order, slug bất biến, partial/expression/GIN indexes.
  - Chạy backend test + lint.
  - Commit đề xuất: `feat: add approved p1 database schema`.
- [x] **Bước 3: Tạo seed P1 idempotent.**
  - Tạo dữ liệu `DP-03`, hash mật khẩu bằng Argon2id, tạo placeholder upload.
  - Chạy seed hai lần; assert số lượng không tăng, history/tổng tiền/trạng thái hợp lệ và không có bảng/dữ liệu review.
  - Chạy backend test + lint.
  - Commit đề xuất: `feat: add idempotent development seed`.
- [x] **Bước 4: Đóng gói backend + database bằng Docker Compose.**
  - Tạo backend Dockerfile và hai service `db`, `backend` trong compose.
  - Thêm healthcheck, migration/seed startup và hai named volumes.
  - Xác nhận backend chỉ khởi động sau khi DB healthy.
  - Chạy build, healthcheck, test và lint liên quan.
  - Commit đề xuất: `chore: containerize backend and database`.

### Chặng B — Frontend và tích hợp

- [x] **Bước 5: Khởi tạo frontend trắng có test.**
  - Tạo React/Vite JavaScript ESM, CSS nền trắng, `HomePage` rỗng và không dùng class Tailwind.
  - Cài `tailwindcss` và `@tailwindcss/vite`; thêm plugin `@tailwindcss/vite` vào `vite.config.js` và `@import "tailwindcss";` vào `frontend/src/styles/global.css`, không tạo cấu hình PostCSS riêng.
  - Tạo Vitest/jsdom/React Testing Library và ESLint.
  - Chạy `npm test`, `npm run lint`, `npm run build` trong frontend.
  - Commit đề xuất: `feat: scaffold blank react frontend`.
- [ ] **Bước 6: Đóng gói frontend và hoàn thiện đúng ba dịch vụ.**
  - Tạo multi-stage frontend Dockerfile và Nginx config.
  - Hoàn thiện service `frontend`; compose chỉ có đúng `frontend`, `backend`, `db`.
  - Từ trạng thái sạch, chạy `docker compose up --build`; xác nhận ba container healthy/running, API 200 và trang `/` trắng.
  - Chạy `docker compose down` không thêm `-v` để giữ volumes.
  - Commit đề xuất: `chore: complete three-service docker stack`.
- [ ] **Bước 7: Cập nhật tài liệu và kiểm tra cuối.**
  - Cập nhật README, `AGENTS.md` mục 2/7/8, tick plan và điền “Kết quả sau khi làm”.
  - Chạy toàn bộ backend test/lint, frontend test/lint/build và lần cuối `docker compose up --build`.
  - Kiểm tra không có `.env`, secret, ảnh upload thật, debug log, TODO vô nghĩa hoặc bảng P2 trong repo/database.
  - Commit đề xuất: `docs: document project scaffold commands`.

Nếu một bước phát sinh thay đổi ngoài danh sách trên, dừng, cập nhật plan và báo người dùng trước khi tiếp tục.

## Rủi ro và điểm cần bảo mật

- Không commit `.env`, connection string thật, mật khẩu admin thật hoặc JWT secret.
- Giá trị trong `.env.example` và compose chỉ là development dummy; README cảnh báo phải đổi trước triển khai (`DP-04`).
- `argon2` có native binary: Docker/CI phải chạy test hash/verify để phát hiện lỗi Alpine sớm.
- Seed không log password/hash; API không bao giờ trả `password_hash`.
- Migration/seed chỉ dùng SQL cố định hoặc query tham số hóa; không ghép dữ liệu vào SQL.
- Script chuẩn bị DB test phải guard hậu tố `_test`; không được drop/reset DB dev/production.
- `docker compose down` trong hướng dẫn không dùng `-v`; xóa volume luôn cần người dùng cho phép riêng.
- Backend startup migration có advisory lock; tránh hai process cùng sửa schema.
- Seed phải transaction và idempotent để restart container không nhân đôi dữ liệu hoặc tồn kho.
- Health endpoint không lộ version DB, SQL, stack trace hay credential.
- CORS chỉ cho `CORS_ORIGIN`; rate limit mặc định theo `NF-04`.
- Uploaded files dùng named volume; `.gitignore` không cho commit ảnh runtime.
- Migration P1 không được vô tình tạo `reviews` hoặc logic tự hoàn thành P2.

## Cách kiểm thử

### Test tự động

Backend:

- Vitest unit test cho env validation, health service/controller và error mapping.
- Supertest cho `GET /api/health`: 200 khi DB sẵn sàng, 503 chuẩn hóa khi DB lỗi.
- Integration test PostgreSQL thật:
  - `pg_trgm` tồn tại.
  - Đúng 14 bảng P1, không có `reviews`.
  - PK/FK/unique/check/index/trigger quan trọng khớp `docs/schema.md`.
  - Tiền và tồn kho âm bị chặn; order code sai regex bị chặn.
  - `order_items.product_id`/`product_variant_id` NOT NULL + RESTRICT; unique order/variant hoạt động.
  - Hoán đổi vị trí ảnh trong một transaction thành công nhờ deferred constraint; trùng ở commit bị từ chối.
  - Sửa slug bị trigger từ chối.
- Seed chạy hai lần cho số lượng ổn định, đủ sáu trạng thái, có cả Guest/Customer, không có review.

Frontend:

- Vitest + React Testing Library xác nhận app render không lỗi, trang chủ không có nội dung hiển thị và nền trắng.
- `npm run build` tạo production bundle.

Toàn hệ thống:

- `npm test` và `npm run lint` ở backend.
- `npm test`, `npm run lint`, `npm run build` ở frontend.
- `docker compose config` hợp lệ.
- `docker compose up --build` từ máy sạch/repo sạch khởi động đủ ba service.

### Test tay — người dùng chạy thử

1. Bảo đảm Docker đang chạy; không cần tạo `.env` để dùng default phát triển.
2. Tại root chạy:

   ```bash
   docker compose up --build
   ```

3. Chờ `db` và `backend` healthy; xác nhận chỉ có ba service `frontend`, `backend`, `db`.
4. Mở `http://localhost:3000/api/health`; mong đợi HTTP 200:

   ```json
   { "status": "ok", "database": "ok" }
   ```

5. Mở `http://localhost:5173`; mong đợi trang trắng, không có lỗi console/network.
6. Tải lại cả hai URL; dữ liệu/health vẫn hoạt động.
7. Dừng bằng:

   ```bash
   docker compose down
   ```

8. Chạy lại `docker compose up --build`; seed không tạo trùng và volume DB/ảnh vẫn còn.
9. Tùy chọn kiểm tra script riêng:

   ```bash
   cd backend
   npm test
   npm run lint
   npm run migrate
   npm run seed

   cd ../frontend
   npm test
   npm run lint
   npm run build
   ```

Không chạy `docker compose down -v` vì lệnh đó xóa dữ liệu volume.

## Tiêu chí hoàn thành

- [x] Plan đã được người dùng nói rõ “duyệt plan” trước khi viết code.
- [ ] Repo có đúng cấu trúc backend/frontend đã nêu, không có code chết hoặc dependency ngoài plan.
- [ ] `docker-compose.yml` có đúng ba dịch vụ và hai named volumes; startup order dựa trên healthcheck.
- [ ] `docker compose up --build` chạy được trên máy sạch bằng default phát triển.
- [ ] `/api/health` trả 200 và xác nhận PostgreSQL + `pg_trgm` sẵn sàng.
- [ ] Frontend `/` là trang trắng và production build thành công.
- [x] Migration tạo đúng 14 bảng P1, toàn bộ constraint/index/trigger đã duyệt, không có `reviews`.
- [x] `order_items` FK NOT NULL/RESTRICT, ảnh có deferred unique, tìm kiếm có GIN `pg_trgm`.
- [x] Seed idempotent, đủ dữ liệu `DP-03`, đủ sáu trạng thái, không seed đánh giá.
- [x] Password seed được hash Argon2id; không có password/hash/secret thật trong repo hoặc API.
- [ ] Backend test/lint xanh; frontend test/lint/build xanh; test schema/seed xanh trên PostgreSQL thật.
- [x] `.env` và upload runtime bị ignore; `.env.example` chỉ có giá trị giả.
- [ ] `README.md` và `AGENTS.md` mục 2, 7, 8 phản ánh đúng file/lệnh đã kiểm chứng.
- [x] `docker compose down` không xóa volumes; không có thao tác phá hủy dữ liệu trong quá trình làm.
- [ ] Mục “Kết quả sau khi làm” được điền trung thực, gồm test đã chạy và tồn đọng.

## Câu hỏi cần xác nhận

Không còn câu hỏi nghiệp vụ. Khi người dùng nói **“duyệt plan”**, hiểu là đồng ý các lựa chọn kỹ thuật sau:

1. Một plan, hai chặng A/B; có thể dừng báo cáo sau mỗi chặng nhưng không cần tạo plan thứ hai.
2. JavaScript ESM + npm, Node 24 LTS, PostgreSQL 18 Alpine.
3. `pg` + `node-pg-migrate`; migration nâng cao viết SQL thuần.
4. Vitest/Supertest cho backend; Vitest/React Testing Library/jsdom cho frontend.
5. Argon2id qua `argon2`; Zod cho env/request validation.
6. Backend container tự chạy migration và seed idempotent khi `RUN_SEED=true` trong môi trường local.
7. Docker frontend dùng Nginx production build; port mặc định frontend 5173, backend 3000.

Nếu không đồng ý một lựa chọn, đề nghị nêu đúng số mục và phương án thay thế trước khi duyệt.

## Kết quả sau khi làm

### Chặng A — hoàn thành ngày 2026-09-22

- Đã dựng backend Express theo lớp route → controller → service → repository, cấu hình Zod, CORS, Helmet, rate limit, lỗi JSON thống nhất và `GET /api/health` kiểm tra PostgreSQL/`pg_trgm`.
- Đã tạo ba migration với đúng 14 bảng P1, constraint/index/trigger theo `docs/schema.md`, gồm `products.badge_label`; không tạo `reviews`.
- Đã tạo seed idempotent: 1 admin, 3 Customer, 20 sản phẩm, 20 ảnh, 40 biến thể, 6 đơn đủ trạng thái Guest/Customer và 17 bản ghi lịch sử; mật khẩu dùng Argon2id.
- Đã đóng gói backend + PostgreSQL 18 Alpine bằng Docker Compose; backend tự migration/seed, healthcheck xanh và restart không nhân bản dữ liệu. Đã chạy `docker compose down` không kèm `-v`; hai named volume vẫn còn.
- Kiểm thử đã chạy: 17/17 test backend xanh trên PostgreSQL 18 thật; `npm run lint` sạch; image backend build thành công; health endpoint trả `{ "status": "ok", "database": "ok" }`; Argon2 hoạt động trong container Alpine.
- Commit Chặng A: `e9110c9`, `d880781`, `3111174`, `ea10569`.
- Còn lại: toàn bộ Chặng B (frontend, service frontend trong Compose, README/AGENTS cập nhật cuối và kiểm tra tích hợp ba service).
