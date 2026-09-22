# AGENTS.md: Website bán giày trực tuyến

Đây là hướng dẫn bắt buộc cho AI coding agent làm việc trong repo này. Đọc hết file trước khi làm bất cứ việc gì.

## 1. Dự án

Website thương mại điện tử bán giày (đồ án môn Lập trình web, PTIT). Khách mua không cần đăng nhập (Guest) hoặc mua qua tài khoản (Customer); Admin quản lý sản phẩm, kho, đơn hàng, thống kê. Thanh toán duy nhất là COD.

**Nguồn sự thật duy nhất về nghiệp vụ: `docs/nghiep-vu.md`.** Mọi quy tắc có mã (`DH-05`, `KHO-03`...) là ràng buộc bắt buộc. Nếu yêu cầu của người dùng mâu thuẫn với file này, hoặc file này mơ hồ, mâu thuẫn, thiếu: **dừng lại và hỏi**, không tự đoán. Nếu cần đổi nghiệp vụ, đề xuất sửa `docs/nghiep-vu.md` và chờ người dùng đồng ý.

Tài liệu liên quan:
- `docs/schema.md`: schema database đã duyệt (nguồn sự thật cho database, khi đã có).
- `docs/plans/`: các file kế hoạch theo từng chức năng.

## 2. Stack đã chốt (không tự đổi)

| Thành phần | Lựa chọn |
|---|---|
| Frontend | React + Vite, JavaScript ESM, HTML; routing bằng `react-router` Declarative Mode |
| UI/CSS | Tailwind CSS v4 qua `@tailwindcss/vite` (không cấu hình PostCSS riêng) |
| Backend | Node.js 24 + Express |
| Database | PostgreSQL 18 Alpine |
| Truy cập database | `pg` + `node-pg-migrate`; migration nâng cao dùng SQL thuần |
| Kiểm tra dữ liệu | Zod |
| Xác thực | JWT access token bằng `jose` (không refresh token), mật khẩu băm Argon2id |
| Kiểm thử | Backend: Vitest + Supertest; frontend: Vitest + React Testing Library + jsdom |
| Lưu ảnh | Thư mục trên server, gắn Docker volume |
| Đóng gói | Docker, Docker Compose |

## 3. Quy trình làm việc bắt buộc

### 3.1 Với chức năng mới hoặc thay đổi lớn
1. **Không viết code ngay.** Đọc `docs/nghiep-vu.md`, `docs/schema.md` và phần code liên quan trước.
2. Tạo file kế hoạch `docs/plans/YYYY-MM-DD-ten-chuc-nang.md` theo `docs/plans/_template.md`. Plan phải nêu: mục tiêu, phạm vi (làm / không làm), mã quy tắc nghiệp vụ liên quan, ảnh hưởng database, danh sách file sẽ tạo/sửa, các bước, rủi ro bảo mật, cách kiểm thử, câu hỏi cần xác nhận.
3. **Dừng lại, chờ người dùng nói "duyệt plan".** Không code trước khi có câu này.
4. Khi code: làm theo từng bước trong plan, tick checkbox khi xong, chạy test cuối mỗi bước.
5. Nếu phát sinh việc ngoài plan, cập nhật plan và báo người dùng trước khi làm tiếp.
6. Xong thì điền mục "Kết quả sau khi làm" trong plan: đã làm gì, đã test gì, còn tồn đọng gì. Sau đó dừng và báo cáo, không tự chuyển sang chức năng khác.

### 3.2 Việc được bỏ qua plan
Sửa lỗi chính tả, đổi chữ hoặc màu, chỉnh CSS nhỏ, đổi tên biến, sửa lỗi rõ ràng trong một file. Nếu việc chạm tới database, tiền, tồn kho, xác thực, phân quyền hoặc trạng thái đơn thì **luôn cần plan**, dù nhỏ.

### 3.3 Git
- Mỗi plan hoặc mỗi bước chạy được là một commit riêng. Không gộp nhiều chức năng vào một commit.
- Commit message bằng tiếng Anh, dạng `feat: add cart merge on login`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Không tự `git push --force`, không xóa lịch sử, không commit trực tiếp khi chưa chạy test liên quan.

## 4. Phạm vi: những việc KHÔNG được tự làm

- Không thêm chức năng thuộc mục "Ngoài phạm vi" của `docs/nghiep-vu.md` (thanh toán online, tích hợp vận chuyển, mã giảm giá, gửi email/SMS, quên mật khẩu, đăng nhập mạng xã hội, xóa/khóa tài khoản khách, đổi trả/hoàn tiền...).
- Không làm chức năng P2 (đánh giá, tự động hoàn thành đơn) khi người dùng chưa yêu cầu.
- Không tự đổi stack, đổi schema, đổi trạng thái đơn hay công thức tính tiền mà không có plan được duyệt.
- Không đổi hoặc xóa migration đã chạy; muốn sửa schema thì tạo migration mới.
- Không xóa dữ liệu, không chạy lệnh phá hủy (drop database, xóa volume, `rm -rf` ngoài thư mục build) nếu chưa hỏi.

## 5. Quy tắc kỹ thuật bắt buộc (rút gọn từ nghiệp vụ)

### 5.1 Tiền và giá
- Tiền là **số nguyên VND**, không dùng float.
- Backend tự tính `line_total`, `subtotal`, `shipping_fee`, `grand_total` (`DH-05`). **Không tin bất kỳ giá trị tiền nào từ client**; đơn giá luôn lấy từ database tại lúc đặt (`DH-07`).
- Đơn hàng lưu **snapshot** tên/thương hiệu/size/màu/ảnh/đơn giá và thông tin người nhận (`DH-06`).

### 5.2 Tồn kho và trạng thái đơn
- Trừ kho khi tạo đơn, hoàn kho khi hủy, **trong cùng transaction** với việc đổi dữ liệu. Trừ kho phải an toàn khi nhiều người mua đồng thời (cập nhật có điều kiện hoặc khóa dòng); một dòng thiếu kho thì cả đơn thất bại (`KHO-02` đến `KHO-04`, `DH-14`).
- Chuyển trạng thái đơn **chỉ theo bảng ở mục 5 của `docs/nghiep-vu.md`**; mọi chuyển đổi khác bị backend từ chối. Mỗi lần đổi ghi vào lịch sử trạng thái (`TT-01` đến `TT-03`).
- Tồn kho không bao giờ âm.

### 5.3 Bảo mật và phân quyền
- Kiểm tra phân quyền (Guest/Customer/Admin) **ở backend** cho mọi API. Customer chỉ truy cập dữ liệu của chính mình. Không tin dữ liệu ẩn/hiện của giao diện.
- Validate mọi đầu vào ở backend (kiểu, độ dài, định dạng, số điện thoại VN 10 số bắt đầu bằng 0).
- Truy vấn database dùng tham số hóa hoặc ORM, không nối chuỗi SQL.
- Không trả mật khẩu/mã băm ra API. Không lộ stack trace hoặc câu SQL trong phản hồi lỗi.
- **Không commit secret.** Chuỗi kết nối DB, khóa ký JWT, mật khẩu admin nằm trong biến môi trường; repo chỉ có `.env.example` với giá trị giả. `.env` phải nằm trong `.gitignore`.
- Có rate limit theo `NF-04` (đăng nhập, đăng ký, tra cứu đơn Guest, tạo đơn).
- Upload ảnh: kiểm tra loại và dung lượng ở backend, đặt tên file ngẫu nhiên, không xóa file vật lý (`SP-13`).
- Frontend không chèn HTML thô từ dữ liệu người dùng (chống XSS, vì token lưu localStorage).

### 5.4 Danh sách
- Tìm kiếm, lọc, sắp xếp, phân trang **thực hiện ở backend** (database), không tải hết rồi lọc ở trình duyệt (`UI-01`). Tránh truy vấn N+1.

### 5.5 Thời gian
- Lưu thời điểm ở dạng `timestamptz` (UTC). Thống kê chuyển sang múi giờ `Asia/Ho_Chi_Minh`, tuần bắt đầu thứ Hai (`TK-03`).

## 6. Quy ước code

- **Ngôn ngữ:** tên biến, hàm, bảng, cột, endpoint, commit bằng tiếng Anh. Văn bản hiển thị cho người dùng (nút, thông báo, lỗi) và tài liệu bằng tiếng Việt. Comment chỉ viết khi giải thích *vì sao*, không mô tả lại code.
- **Cột database:** `snake_case`; bảng số nhiều theo mục 6 của `docs/nghiep-vu.md` (`products`, `order_items`...).
- **API:** REST, JSON. Lỗi trả về dạng thống nhất `{ "error": { "code": "...", "message": "..." } }` với HTTP status đúng nghĩa (400, 401, 403, 404, 409, 429, 500). Danh sách trả kèm thông tin phân trang.
- **Backend:** tách lớp rõ ràng (route → controller → service → truy cập dữ liệu). Logic nghiệp vụ (tính tiền, kho, trạng thái) nằm ở service, không nằm trong route hay frontend.
- **Frontend:** component nhỏ, tách trang / component / gọi API / state. Bộ lọc danh sách nằm trên URL query string (`KH-04`). Mọi màn hình có trạng thái tải, lỗi, rỗng (`UI-04`). Giao diện khách responsive (`UI-03`).
- Không để lại code chết, `console.log` gỡ lỗi, hoặc TODO không kèm giải thích.
- Ưu tiên giải pháp đơn giản, ít dependency. Đây là đồ án: đừng thiết kế quá mức (microservice, cache phân tán, hàng đợi...).

## 7. Cấu trúc thư mục

```
shoe-store-webapp/
├── AGENTS.md
├── .env.example
├── docker-compose.yml
├── README.md
├── docs/
│   ├── nghiep-vu.md
│   ├── schema.md
│   └── plans/
├── backend/
│   ├── Dockerfile
│   ├── migrations/
│   ├── scripts/
│   ├── seeds/
│   ├── src/ (config, controllers, db, middlewares, routes, services)
│   ├── tests/ (unit, integration)
│   └── uploads/            (gắn volume, không commit ảnh thật)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/ (pages, styles, tests)
```

## 8. Lệnh thường dùng

> Các lệnh dưới đây đã được xác nhận với khung dự án. Các lệnh database chạy ngoài Docker cần `DATABASE_URL`; test tích hợp cần `TEST_DATABASE_URL` trỏ tới database có tên kết thúc bằng `_test`.

```bash
# Chạy toàn hệ thống (frontend, backend, database)
docker compose up --build

# Dừng
docker compose down

# Backend
cd backend
npm ci
npm run dev               # chạy development
npm start                 # chạy production
npm test                  # toàn bộ test
npm run test:coverage
npm run test:integration  # reset an toàn DB *_test rồi kiểm tra schema
npm run test:seed         # reset an toàn DB *_test rồi kiểm tra seed hai lần
npm run lint
npm run migrate
npm run seed              # nạp dữ liệu mẫu, chạy lặp lại không tạo trùng

# Frontend
cd frontend
npm ci
npm run dev
npm run build
npm run preview
npm test
npm run test:coverage
npm run lint
```

## 9. Kiểm thử

- Logic quan trọng **phải có test tự động** (`NF-09`): tính giá và tổng tiền, trừ/hoàn tồn kho (kể cả hai yêu cầu đồng thời cho cùng biến thể), bảng chuyển trạng thái, phân quyền, thống kê doanh thu.
- Chạy test liên quan sau mỗi bước; chạy toàn bộ test trước khi báo hoàn thành plan. Test lỗi thì báo cáo trung thực, không sửa test cho khớp code sai, không bỏ qua test.
- Ngoài test tự động, nêu trong plan các bước **người dùng nên chạy thử bằng tay** trên giao diện.

## 10. Định nghĩa "hoàn thành" một chức năng

- [ ] Plan đã được duyệt và các bước đã tick.
- [ ] Đúng các quy tắc nghiệp vụ liên quan (nêu mã quy tắc trong plan).
- [ ] Test tự động liên quan đã viết và **đang xanh**; lint sạch.
- [ ] Không phá chức năng đã có (chạy lại toàn bộ test).
- [ ] Chạy được bằng `docker compose up --build` trên máy sạch, không phụ thuộc file cục bộ chưa commit.
- [ ] Không còn secret hoặc dữ liệu thật trong code.
- [ ] Plan có mục "Kết quả sau khi làm" đã điền trung thực, kể cả việc chưa làm được.

## 11. Cách giao tiếp

- Trả lời bằng tiếng Việt, ngắn gọn, nêu rõ việc đã làm, file đã đổi, cách kiểm tra.
- Khi không chắc, **hỏi một câu cụ thể kèm phương án đề xuất** thay vì tự bịa hoặc hỏi chung chung.
- Nếu phát hiện lỗi hoặc mâu thuẫn trong `docs/nghiep-vu.md`, nêu ra ngay, không lặng lẽ làm theo cách hiểu riêng.
- Báo cáo trung thực khi có phần chưa làm, chưa test được hoặc còn rủi ro.
