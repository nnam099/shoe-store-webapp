# Kế hoạch: Quản lý sản phẩm và danh mục phía Admin

- Ngày: 2026-09-23
- Trạng thái: Hoàn thành — ngày 2026-09-23

## Mục tiêu

Xây dựng đầy đủ khu vực Admin để quản lý sản phẩm, giá, nhãn trang trí, ảnh, biến thể size–màu và tồn kho; đồng thời quản lý loại giày, thương hiệu, size và màu sắc. Toàn bộ API quản trị tái sử dụng chuỗi middleware `authenticateAccessToken` + `requireRole("admin")` hiện có, bảo đảm dữ liệu sản phẩm luôn đúng các bất biến trong schema và `SP-01` đến `SP-15`.

## Phạm vi

### Làm

- Danh sách sản phẩm Admin:
  - Tìm theo tên không phân biệt hoa/thường và không dấu qua `products.search_name`.
  - Lọc theo thương hiệu và loại giày; sắp xếp; phân trang 20 sản phẩm/trang ở backend.
  - Hiển thị ảnh chính, tên, thương hiệu, loại, giá/giá khuyến mãi, nhãn trang trí, tổng tồn kho và trạng thái còn/hết hàng.
- Thêm sản phẩm trong một luồng gồm thông tin cơ bản, đúng một loại giày, đúng một thương hiệu, giá, nhãn tùy chọn, ít nhất một biến thể và 1–8 ảnh.
- Sửa thông tin sản phẩm, giá/giá khuyến mãi, nhãn trang trí; slug không xuất hiện dưới dạng trường cho Admin sửa và không đổi khi đổi tên.
- Xóa mềm sản phẩm bằng `deleted_at`; xác nhận trước khi xóa; không xóa ảnh vật lý và không thay đổi snapshot trong đơn cũ.
- Quản lý ảnh trong trang sửa sản phẩm:
  - Upload thêm nhiều ảnh, tối đa tổng cộng 8 ảnh/sản phẩm.
  - Ảnh vị trí 1 là ảnh chính; cho sắp xếp lại toàn bộ ảnh.
  - Gỡ bản ghi ảnh nhưng không xóa file vật lý; không cho gỡ ảnh cuối cùng.
  - Phục vụ file ảnh từ thư mục upload đã gắn Docker volume để Admin xem preview.
- Quản lý biến thể trong trang sửa sản phẩm:
  - Thêm/khôi phục biến thể theo cặp size–màu, cập nhật tồn kho bằng số nguyên không âm.
  - Xóa mềm biến thể; không cho xóa biến thể đang bán cuối cùng.
  - Không tạo lại ID mới nếu cặp size–màu đã tồn tại ở dòng xóa mềm.
- CRUD loại giày, thương hiệu, size, màu:
  - Tìm kiếm, sắp xếp, phân trang 20 dòng/trang ở backend cho màn hình quản lý.
  - Tên/giá trị được trim, duy nhất không phân biệt hoa thường trong từng nhóm; màu có `hexCode` tùy chọn đúng `#RRGGBB`.
  - Khi xóa mục đang được dùng, trả 409 và thông báo rõ số sản phẩm đang bán cùng số sản phẩm đã xóa mềm đang dùng mục đó.
  - Có endpoint options gọn để form sản phẩm tải các lựa chọn thương hiệu/loại/size/màu.
- Giao diện Admin tách biệt với giao diện khách: sidebar tối, nền sáng/kính mờ, responsive cơ bản; có loading/error/empty/success, focus rõ và xác nhận thao tác xóa.
- Test backend trên PostgreSQL thật và thư mục upload tạm; test component/page/API frontend; kiểm tra Docker volume ảnh vẫn hoạt động sau recreate container.

### Không làm (để sau)

- Trang danh sách/chi tiết sản phẩm phía khách, giỏ hàng đầy đủ, checkout, đơn hàng, thống kê hay tự tính nhãn “Bán chạy”.
- Lịch sử điều chỉnh kho hoặc nhập/xuất kho riêng; plan này chỉ đặt trực tiếp `stock_quantity` trên từng biến thể theo `KHO-05`.
- Khôi phục sản phẩm đã xóa mềm, xóa cứng sản phẩm/biến thể, hoặc tái sử dụng slug của sản phẩm đã xóa.
- Xóa file ảnh vật lý, dọn file mồ côi, nén/cắt ảnh, tạo thumbnail, CDN/object storage hoặc upload từ URL bên ngoài.
- Ảnh riêng theo màu/biến thể; ảnh vẫn thuộc cấp sản phẩm.
- Import/export Excel/CSV, chỉnh sửa hàng loạt hoặc kéo-thả bằng thư viện ngoài. Việc sắp xếp ảnh dùng nút di chuyển lên/xuống để đơn giản và accessible.
- Thêm bộ UI/component hoàn chỉnh; tiếp tục dùng React state và Tailwind CSS v4 hiện có.

## Quy tắc nghiệp vụ liên quan

### Quy tắc người dùng yêu cầu trực tiếp

- `QT-A02`: danh sách Admin, CRUD sản phẩm, ảnh, giá, biến thể và tồn kho; phân trang 20; lỗi bắt buộc/giá/biến thể/ảnh.
- `QT-A03`: CRUD loại giày, thương hiệu, size và màu; chặn xóa khi đang được dùng và chặn tên trùng.
- `SP-01`: sản phẩm có đúng một loại giày và một thương hiệu.
- `SP-02`: giá bán là số nguyên VND dương và sản phẩm có ít nhất một ảnh.
- `SP-03`, `SP-04`, `SP-05`: giá khuyến mãi tùy chọn, dương và nhỏ hơn giá bán; giá hiệu lực lấy giá khuyến mãi nếu có; giá nằm ở cấp sản phẩm.
- `SP-06`, `SP-07`: ít nhất một biến thể; cặp size–màu không trùng; trạng thái còn hàng tính từ tồn kho biến thể.
- `SP-08`: xóa sản phẩm là xóa mềm, không làm mất dữ liệu đơn cũ/báo cáo.
- `SP-09`: không xóa lookup đang được dùng; phải tính cả sản phẩm đã xóa mềm và báo tách hai số lượng.
- `SP-10`: tên/giá trị lookup duy nhất không phân biệt hoa thường trong từng nhóm.
- `SP-11`: chỉ JPG/PNG/WebP, tối đa 5 MiB mỗi ảnh và 8 ảnh mỗi sản phẩm.
- `SP-12`: backend sinh slug không dấu, duy nhất bằng hậu tố `-2`, `-3`…, bất biến sau khi tạo và không tái sử dụng slug đã xóa mềm.
- `SP-13`: gỡ ảnh/xóa sản phẩm không xóa file vật lý; dọn file mồ côi ngoài phạm vi.
- `SP-14`: biến thể xóa mềm; khôi phục đúng dòng cũ; không xóa biến thể đang bán cuối cùng.
- `SP-15`: nhãn do Admin chọn thủ công, chỉ `new`, `bestseller`, `featured` hoặc `null`; giao diện ánh xạ lần lượt thành “Mới”, “Bán chạy”, “Nổi bật”.
- `NF-05`: backend kiểm tra loại/dung lượng ảnh và đặt tên file ngẫu nhiên.

### Quy tắc kỹ thuật kéo theo

- `KHO-01`, `KHO-05`, `KHO-06`: tồn kho theo biến thể, Admin đặt trực tiếp số nguyên từ 0 trở lên và không bao giờ âm.
- `UI-01`, `UI-02`: danh sách sản phẩm Admin tìm/lọc/sắp xếp/phân trang tại database, 20 dòng/trang; tham số trang sai dùng mặc định.
- `UI-04`, `UI-05`: mọi màn hình có trạng thái tải/lỗi/rỗng và mọi thao tác xóa có xác nhận.
- `NF-01`, `NF-02`, `NF-03`, `NF-04`, `NF-06`, `NF-09`, `NF-10`: validate backend, SQL tham số hóa, CORS/rate limit chung, không lộ lỗi nội bộ, test logic quan trọng và giao diện có title/loading/error phù hợp.
- `QT-02`, `QT-03`: Customer không gọi được API Admin; phân quyền quyết định ở backend, giao diện chỉ hỗ trợ điều hướng.
- `DH-06`: đơn cũ dùng snapshot, nên sửa/xóa sản phẩm, đổi giá hoặc gỡ ảnh không được sửa dữ liệu `order_items` và file ảnh snapshot vẫn phải còn.

## Thiết kế API và hành vi dự kiến

Tất cả endpoint dưới `/api/admin` bên dưới endpoint đăng nhập đã đi qua `authenticateAccessToken` và `requireRole("admin")` tại `admin.routes.js`; không lặp lại hoặc dựng middleware xác thực mới.

### Sản phẩm

| Method | Endpoint | Hành vi |
|---|---|---|
| `GET` | `/api/admin/products` | `q`, `categoryId`, `brandId`, `sort`, `page`; 20 dòng/trang, chỉ sản phẩm chưa xóa; trả `items` và `pagination`. |
| `GET` | `/api/admin/products/options` | Trả danh sách loại, thương hiệu, size và màu đã sắp xếp để dùng trong form. |
| `GET` | `/api/admin/products/:productId` | Chi tiết sản phẩm đang bán cùng ảnh đúng thứ tự và biến thể chưa xóa. |
| `POST` | `/api/admin/products` | `multipart/form-data`: trường `data` là JSON sản phẩm + danh sách biến thể, trường `images` lặp 1–8 file; tạo atomically ở database. |
| `PATCH` | `/api/admin/products/:productId` | Sửa thông tin cấp sản phẩm; không nhận `slug`, ảnh hoặc biến thể. |
| `DELETE` | `/api/admin/products/:productId` | Xóa mềm sản phẩm; gọi lặp lại trả 404, không đụng file ảnh/biến thể/đơn cũ. |

`sort` nhận `newest` (mặc định), `oldest`, `name_asc`, `name_desc`, `price_asc`, `price_desc`; mọi thứ tự có thêm `id` làm khóa phụ để phân trang ổn định. Khoảng giá không nhận từ client khi tính trạng thái; giá hiệu lực do backend trả bằng `COALESCE(sale_price, price)`.

Payload `data` lúc tạo gồm `name`, `description`, `material`, `categoryId`, `brandId`, `price`, `salePrice`, `badgeLabel`, `variants[]`. Mỗi biến thể gồm `sizeId`, `colorId`, `stockQuantity`; backend loại trùng theo cặp và bắt buộc ít nhất một dòng. Chuỗi trống tùy chọn được chuẩn hóa thành `null`; tiền/tồn kho chỉ nhận số nguyên an toàn, không dùng float.

### Ảnh sản phẩm

| Method | Endpoint | Hành vi |
|---|---|---|
| `POST` | `/api/admin/products/:productId/images` | Upload một hoặc nhiều file, không vượt số chỗ còn lại trong giới hạn 8; nối vào cuối danh sách. |
| `PUT` | `/api/admin/products/:productId/images/order` | Nhận toàn bộ `imageIds` hiện tại theo thứ tự mới; từ chối thiếu, thừa, trùng hoặc ID không thuộc sản phẩm. |
| `DELETE` | `/api/admin/products/:productId/images/:imageId` | Xóa bản ghi và đánh lại vị trí liền mạch; chặn nếu đây là ảnh cuối; không xóa file vật lý. |
| `GET` | `/uploads/:filename` | Phục vụ file công khai theo tên ngẫu nhiên/seed từ `UPLOAD_DIR`, không cho duyệt thư mục. |

- Middleware multipart chạy **sau** guard Admin để request Guest/Customer không được ghi/buffer file.
- Dùng memory storage có giới hạn: tối đa 8 file, 5 MiB/file và giới hạn trường metadata. Sau đó kiểm tra magic bytes thực tế bằng `file-type`; không tin tên hoặc MIME do client gửi.
- Chỉ cho JPEG, PNG, WebP. File hợp lệ được ghi bằng `crypto.randomUUID()` và phần mở rộng chuẩn suy ra từ nội dung; không dùng tên/path gốc từ client. Database lưu tên file tương đối, DTO trả thêm URL `/uploads/<filename>`.
- Khi tạo/upload, ghi database trong transaction và chỉ commit sau khi ghi file thành công. Filesystem không thể tham gia transaction; nếu lỗi database xảy ra sau khi file đã ghi thì file có thể thành mồ côi và vẫn được giữ đúng chính sách `SP-13`, việc dọn dẹp ngoài phạm vi.
- Đổi thứ tự dùng constraint unique deferrable hiện có; mọi vị trí sau cập nhật phải liên tục từ 1, vị trí 1 là ảnh chính.

### Biến thể và tồn kho

| Method | Endpoint | Hành vi |
|---|---|---|
| `POST` | `/api/admin/products/:productId/variants` | Thêm cặp size–màu; nếu cặp đã xóa mềm thì khôi phục đúng ID cũ và đặt tồn kho mới; nếu đang hoạt động thì trả 409. |
| `PATCH` | `/api/admin/products/:productId/variants/:variantId` | Chỉ cập nhật `stockQuantity` bằng số nguyên không âm. |
| `DELETE` | `/api/admin/products/:productId/variants/:variantId` | Xóa mềm; chặn biến thể đang bán cuối cùng; gọi lặp lại trả 404. |

Mọi thay đổi biến thể khóa dòng sản phẩm/biến thể cần thiết trong transaction để serialize với cập nhật kho về sau. Cặp size–màu của một dòng được coi là danh tính bất biến; muốn đổi cặp, Admin xóa mềm dòng cũ rồi thêm cặp mới. Khi cặp mới trùng một dòng đã xóa, service khôi phục dòng đó thay vì insert.

### Danh mục và thuộc tính

`resource` là một trong `categories`, `brands`, `sizes`, `colors`:

| Method | Endpoint | Hành vi |
|---|---|---|
| `GET` | `/api/admin/catalog/:resource` | `q`, `sort`, `page`; 20 dòng/trang ở backend. |
| `POST` | `/api/admin/catalog/:resource` | Tạo tên/giá trị; màu nhận thêm `hexCode` tùy chọn. |
| `PATCH` | `/api/admin/catalog/:resource/:id` | Đổi tên/giá trị hoặc mã màu; Admin được đổi tên cả khi đang được dùng. |
| `DELETE` | `/api/admin/catalog/:resource/:id` | Xóa cứng nếu chưa được dùng; nếu đang dùng trả 409 với message chứa số sản phẩm đang bán và đã xóa mềm. |

Với size/màu, số sản phẩm dùng được tính `COUNT(DISTINCT product_id)` qua mọi dòng `product_variants`, kể cả biến thể và sản phẩm đã xóa mềm. Với loại/thương hiệu, đếm trực tiếp từ mọi dòng `products`. Việc đếm và xóa nằm trong transaction; FK `ON DELETE RESTRICT` vẫn là lớp bảo vệ cuối nếu có race.

## Lựa chọn thư viện chờ duyệt cùng plan

- Thêm `multer` cho parsing `multipart/form-data` và giới hạn số file/dung lượng ngay khi nhận request. Đây là middleware nhỏ, phổ biến cho Express và tránh tự viết multipart parser dễ sai.
- Thêm `file-type` để kiểm tra chữ ký nhị phân thực tế của JPG/PNG/WebP; `multer` chỉ cung cấp MIME do client khai báo nên chưa đủ đáp ứng `NF-05`.
- Không thêm thư viện slug: dùng `String.prototype.normalize("NFD")`, loại dấu tiếng Việt (xử lý riêng `đ/Đ`), chuẩn hóa dấu gạch và retry khi unique conflict.
- Không thêm thư viện drag-drop, form, state hoặc UI. Sau khi cài và kiểm chứng, bổ sung lựa chọn upload vào bảng stack trong `AGENTS.md`.

## Ảnh hưởng đến database

- **Không có migration và không sửa schema.** Các bảng/cột/index/constraint/trigger đã đủ:
  - `products`: FK loại/thương hiệu, giá, `badge_label`, `search_name`, slug unique/bất biến, `deleted_at`.
  - `product_images`: tên file unique, vị trí 1–8, unique vị trí deferrable.
  - `product_variants`: unique `(product_id, size_id, color_id)`, tồn kho không âm, `deleted_at`.
  - `categories`, `brands`, `sizes`, `colors`: unique không phân biệt hoa thường và FK `ON DELETE RESTRICT`.
- Dùng transaction cho tạo sản phẩm, thay đổi ảnh/biến thể và xóa lookup; không sửa migration đã chạy.
- Không thêm index mới: các index sản phẩm, GIN `search_name`, biến thể và unique lookup hiện có phục vụ truy vấn dự kiến ở quy mô hiện tại.

## Các file sẽ tạo/sửa

### Cấu hình và tài liệu

- `backend/package.json`, `backend/package-lock.json`: thêm `multer` và `file-type` sau khi plan được duyệt.
- `AGENTS.md`: ghi lựa chọn upload đã được duyệt và cập nhật cây thư mục nếu cần.
- `README.md`: bổ sung route Admin sản phẩm, endpoint upload, giới hạn ảnh và cách kiểm tra volume upload.
- `docs/plans/2026-09-23-quan-ly-san-pham.md`: tick từng bước và điền kết quả cuối.

### Backend

- `backend/src/app.js`: wiring repository/service/controller mới và phục vụ `/uploads` an toàn từ `UPLOAD_DIR`.
- `backend/src/routes/admin.routes.js`: mount product/catalog router bên dưới guard Admin hiện có; không tạo lại auth middleware.
- `backend/src/routes/admin-product.routes.js`, `backend/src/routes/admin-catalog.routes.js`: route REST, validation và multipart theo đúng thứ tự middleware.
- `backend/src/controllers/admin-product.controller.js`, `backend/src/controllers/admin-catalog.controller.js`: nhận request, gọi service, trả DTO/status chuẩn.
- `backend/src/services/admin-product.service.js`, `backend/src/services/admin-catalog.service.js`: bất biến sản phẩm/ảnh/biến thể, slug, transaction và lỗi nghiệp vụ.
- `backend/src/db/admin-product.repository.js`, `backend/src/db/admin-catalog.repository.js`: query tham số hóa, phân trang/filter/sort allowlist, lock dòng và thống kê usage.
- `backend/src/schemas/admin-product.schemas.js`, `backend/src/schemas/admin-catalog.schemas.js`: Zod cho params/query/body/metadata multipart.
- `backend/src/middlewares/upload-product-images.js`: cấu hình Multer memory storage và ánh xạ lỗi file count/size về error envelope chuẩn.
- `backend/src/utils/product-image.js`, `backend/src/utils/product-slug.js`, `backend/src/utils/public-product.js`: kiểm tra magic bytes/ghi file ngẫu nhiên, chuẩn hóa tên/search/slug, DTO và ánh xạ nhãn.
- `backend/src/errors/app-error.js`, `backend/src/middlewares/error-handler.js`: chỉ sửa nếu cần ánh xạ lỗi multipart/unique/FK sang 400/409 mà không lộ nội bộ.
- `backend/tests/unit/product-slug.test.js`, `backend/tests/unit/product-validation.test.js`, `backend/tests/unit/product-image.test.js`: logic thuần và validation upload.
- `backend/tests/integration/admin-products.test.js`, `backend/tests/integration/admin-catalog.test.js`: API, transaction, phân quyền, file tạm và PostgreSQL thật.

### Frontend

- `frontend/src/api/http.js`: hỗ trợ `FormData` mà không tự đặt `Content-Type`; vẫn gắn Bearer và giữ error envelope hiện có.
- `frontend/src/api/admin-products.api.js`, `frontend/src/api/admin-catalog.api.js`: gọi API danh sách/CRUD/upload/reorder/biến thể.
- `frontend/src/App.jsx`: thêm route Admin sản phẩm và danh mục dưới `ProtectedRoute` role `admin`.
- `frontend/src/components/admin/AdminLayout.jsx`, `frontend/src/components/admin/AdminSidebar.jsx`: layout/sidebar Admin responsive dùng chung; thay trang đích Admin tối thiểu hiện tại.
- `frontend/src/components/admin/ConfirmDialog.jsx`, `frontend/src/components/admin/Pagination.jsx`: xác nhận xóa accessible và phân trang dùng lại.
- `frontend/src/components/products/ProductForm.jsx`, `frontend/src/components/products/ImageManager.jsx`, `frontend/src/components/products/VariantManager.jsx`: form, preview/thứ tự ảnh, biến thể/tồn kho.
- `frontend/src/pages/admin/AdminHomePage.jsx`: chuyển sang dùng layout Admin mới.
- `frontend/src/pages/admin/AdminProductListPage.jsx`, `frontend/src/pages/admin/AdminProductCreatePage.jsx`, `frontend/src/pages/admin/AdminProductEditPage.jsx`: danh sách/thêm/sửa sản phẩm.
- `frontend/src/pages/admin/AdminCatalogPage.jsx`: CRUD bốn nhóm lookup theo tab/section.
- `frontend/src/styles/global.css`: chỉ bổ sung token/style dùng chung còn thiếu theo `docs/design-reference.md`, không thêm UI library.
- `frontend/src/tests/AdminProductPages.test.jsx`, `frontend/src/tests/AdminCatalogPage.test.jsx`, `frontend/src/tests/AdminLayout.test.jsx`: form, query string, trạng thái và xác nhận xóa.

## Các bước thực hiện

- [x] **Bước 1: Chốt dependency upload, hợp đồng API và utilities nền.**
  - Cài `multer`/`file-type`, cập nhật lockfile và `AGENTS.md` sau khi kiểm chứng.
  - Tạo schema query/body/multipart, slug/search normalization, kiểm tra magic bytes, tên file ngẫu nhiên và static upload route.
  - Viết unit test validation/slug/upload; chạy backend test + lint.
  - Commit đề xuất: `chore: add product upload dependencies`.
- [x] **Bước 2: Làm CRUD danh mục và thuộc tính.**
  - Tạo route/controller/service/repository cho categories/brands/sizes/colors dưới guard Admin hiện có.
  - Xử lý unique case-insensitive; đếm usage active/deleted chính xác và chặn xóa bằng 409 trong transaction.
  - Test 401/403/Admin, CRUD, validation, conflict, usage counts và race FK trên PostgreSQL thật.
  - Commit đề xuất: `feat: add admin product catalog management`.
- [x] **Bước 3: Làm danh sách, tạo, sửa và xóa mềm sản phẩm.**
  - Query tìm/lọc/sort/phân trang 20; detail/options; tránh N+1 khi lấy ảnh chính/tổng tồn.
  - Tạo multipart với ít nhất một ảnh/biến thể trong transaction; slug unique retry; sửa core không đổi slug; xóa mềm.
  - Test giá/nhãn/FK, slug không dấu/collision/bất biến, transaction rollback, snapshot đơn cũ và phân quyền.
  - Commit đề xuất: `feat: add admin product CRUD`.
- [x] **Bước 4: Làm quản lý ảnh sản phẩm.**
  - Upload thêm, kiểm tra bytes/size/count, lưu tên ngẫu nhiên; reorder; gỡ record/compact vị trí nhưng giữ file.
  - Test file hợp lệ/sai định dạng/giả MIME/quá 5 MiB/quá 8 ảnh, ảnh cuối, reorder và file còn tồn tại sau gỡ/xóa sản phẩm.
  - Commit đề xuất: `feat: add product image management`.
- [x] **Bước 5: Làm quản lý biến thể và tồn kho.**
  - Thêm hoặc khôi phục theo cặp, đặt tồn kho, xóa mềm và chặn biến thể cuối trong transaction.
  - Test cặp trùng, ID được tái sử dụng khi restore, tồn kho âm/float, ownership, concurrent update và FK lookup.
  - Commit đề xuất: `feat: add product variant management`.
- [x] **Bước 6: Dựng layout và giao diện danh sách/CRUD lookup Admin.**
  - Sidebar Admin dùng chung; trang catalog có search/sort/page trên URL query string, form create/edit và confirm delete.
  - Hiển thị usage conflict, loading/error/empty/success; test component/page; chạy frontend test + lint + build.
  - Commit đề xuất: `feat: add admin catalog interface`.
- [x] **Bước 7: Dựng giao diện danh sách/thêm/sửa sản phẩm.**
  - Danh sách filter/sort/page trên URL; form tạo multipart; trang sửa core, ảnh và biến thể; định dạng VND và badge tiếng Việt.
  - Preview ảnh local, revoke object URL; thao tác reorder/xóa accessible; giữ dữ liệu form khi API lỗi.
  - Test luồng Customer/Admin guard, create/edit/delete, upload error, ảnh/biến thể và trang chủ không bị thay đổi.
  - Commit đề xuất: `feat: add admin product management interface`.
- [x] **Bước 8: Kiểm tra tích hợp và hoàn thiện tài liệu.**
  - Chạy toàn bộ backend/frontend test, coverage, lint, build và test PostgreSQL thật.
  - Chạy `docker compose up --build`; smoke test API/UI, upload rồi recreate backend để xác nhận ảnh trong volume còn phục vụ được.
  - Audit auth, path traversal, MIME spoof, giới hạn upload, SQL/XSS, error response, secret/debug log; `docker compose down` không `-v`.
  - Cập nhật README/AGENTS và điền “Kết quả sau khi làm”.
  - Commit đề xuất: `docs: document admin product management`.

Nếu phát sinh file/thay đổi ngoài các nhóm trên hoặc cần đổi schema, dừng lại, cập nhật plan và báo người dùng trước khi tiếp tục.

## Rủi ro và điểm cần bảo mật

- **Phân quyền:** mọi product/catalog route được mount sau guard Admin cấp namespace. Upload middleware cũng phải đứng sau guard để request trái quyền không tiêu tốn bộ nhớ/ghi file. Test ma trận thiếu token, Customer token, Admin token.
- **Upload độc hại/DoS:** không tin extension/MIME/tên file; kiểm tra magic bytes; giới hạn 5 MiB/file, 8 file/request và 8 ảnh/sản phẩm; giới hạn metadata; tên UUID; không cho client truyền đường dẫn. Chỉ phục vụ file basename trong upload root và chặn dotfile/path traversal.
- **Memory upload:** tối đa lý thuyết khoảng 40 MiB cho một request tạo sản phẩm. General rate limit hiện có vẫn áp dụng; không tăng giới hạn hoặc thêm bypass.
- **Filesystem không transaction:** ưu tiên không bao giờ để database trỏ tới file chưa ghi. File mồ côi có thể còn khi DB rollback sau lúc ghi; không tự xóa vì `SP-13`, ghi nhận rõ và để công cụ dọn riêng ngoài phạm vi.
- **Bất biến liên bảng:** tạo sản phẩm/ảnh/biến thể, gỡ ảnh cuối, xóa biến thể cuối, reorder và lookup usage đều kiểm tra trong transaction có lock thích hợp; DB constraint/FK là lớp bảo vệ cuối.
- **Race slug/unique:** slug thử hậu tố và retry khi PostgreSQL báo unique conflict; tên lookup dựa vào unique index, không chỉ kiểm tra trước bằng `SELECT`.
- **Kho đồng thời:** cập nhật tồn kho khóa đúng row và luôn dựa vào `CHECK stock_quantity >= 0`; không nhận phép tính/giá trị float hoặc để client gửi biểu thức tăng giảm.
- **Đơn cũ:** không cập nhật `order_items`, không xóa cứng sản phẩm/biến thể/file; sửa giá chỉ tác động `products` hiện tại.
- **SQL/XSS:** mọi ID/sort/filter được Zod validate và sort dùng allowlist; SQL tham số hóa; mô tả/tên hiển thị bằng React text, không dùng HTML thô.
- **Lỗi:** ánh xạ validation, duplicate, FK và multipart sang error JSON chuẩn; không trả stack trace, SQL, đường dẫn filesystem hay chi tiết thư viện.

## Cách kiểm thử

### Test tự động backend

- Unit:
  - Chuẩn hóa `search_name` và slug tiếng Việt, `đ/Đ`, ký tự đặc biệt, tên chỉ có ký tự không hợp lệ.
  - Validate giá nguyên/dương, sale price, badge, variants không trùng, stock nguyên không âm, lookup/hex color, query defaults.
  - Nhận diện JPG/PNG/WebP bằng bytes; từ chối MIME giả/định dạng khác; tên file UUID không chứa tên gốc.
- Integration trên PostgreSQL 18 và upload directory tạm:
  - Danh sách tìm không dấu, filter AND, sáu sort, pagination 20/default và thống kê tồn kho không N+1.
  - Tạo sản phẩm đầy đủ; rollback khi category/variant/file lỗi; slug collision/concurrent tạo; đổi tên giữ slug.
  - Giá/nhãn cập nhật đúng, order snapshot không đổi; xóa sản phẩm chỉ đặt `deleted_at` và file vẫn còn.
  - Upload/reorder/gỡ ảnh giữ vị trí liên tục, chặn ảnh cuối/quá 8; file gỡ vẫn đọc được; static route chặn traversal.
  - Variant add/duplicate/update/delete/restore đúng ID, chặn dòng cuối, stock không âm và thao tác chỉ trong đúng sản phẩm.
  - CRUD bốn lookup; unique khác hoa thường; đổi tên đang dùng; delete unused; 409 có số active/deleted đúng kể cả product/variant xóa mềm.
  - Toàn bộ endpoint: Guest 401, Customer 403, Admin đúng quyền; response không lộ đường dẫn nội bộ/SQL.

### Test tự động frontend

- Layout/sidebar Admin render đúng route, trạng thái active và responsive cơ bản; route guard sai vai trò vẫn hoạt động.
- Danh sách sản phẩm đồng bộ q/filter/sort/page với URL và request backend; hiển thị loading/error/empty/pagination.
- Form tạo giữ dữ liệu khi lỗi, tạo đúng FormData, validate UX và hiển thị field error backend.
- Trang sửa không cho sửa slug; định dạng VND/badge; upload preview, reorder, gỡ ảnh cuối; thêm/restore/xóa variant và stock error.
- Trang catalog CRUD theo bốn nhóm, conflict usage và xác nhận xóa; không lọc toàn bộ dữ liệu ở trình duyệt.
- Trang chủ `/` vẫn là `main` rỗng; các luồng xác thực đã có không regress.

### Test tay người dùng nên chạy

1. Đăng nhập Admin rồi mở danh sách sản phẩm; thử tìm không dấu, lọc thương hiệu + loại, mọi sort và chuyển trang. Dùng Customer token/URL trực tiếp để xác nhận bị chặn.
2. Tạo sản phẩm với một ảnh và một biến thể; thử thiếu ảnh/biến thể, giá 0, sale price bằng/lớn hơn giá gốc, biến thể trùng, stock âm và badge từng giá trị.
3. Tạo hai sản phẩm cùng tên để kiểm tra slug thứ hai có hậu tố; đổi tên sản phẩm và xác nhận slug cũ không đổi.
4. Upload JPG/PNG/WebP hợp lệ; thử file đổi đuôi giả, file quá 5 MiB và ảnh thứ 9; sắp xếp để đổi ảnh chính rồi refresh trang.
5. Gỡ một ảnh và xóa mềm sản phẩm; xác nhận file URL cũ vẫn tải được và sản phẩm không còn trong danh sách Admin đang bán.
6. Thêm/cập nhật/xóa biến thể; thử xóa biến thể cuối; thêm lại đúng cặp đã xóa và xác nhận cùng ID được khôi phục, tồn kho không âm.
7. CRUD loại/thương hiệu/size/màu; thử tên trùng khác hoa thường, hex sai; xóa mục unused và xóa mục đang dùng bởi cả sản phẩm active/deleted để kiểm tra thông báo hai số.
8. Sửa giá/tên/ảnh sản phẩm đã có trong đơn seed rồi kiểm tra chi tiết dòng đơn trong database/API vẫn giữ snapshot cũ.
9. Chạy `docker compose up --build`, upload ảnh, recreate riêng backend rồi xác nhận ảnh vẫn tồn tại; cuối cùng `docker compose down` không `-v`.

## Tiêu chí hoàn thành

- [x] Plan đã được người dùng nói rõ “duyệt plan” trước khi cài dependency hoặc viết code.
- [x] Không có migration/schema change; migration cũ không bị sửa và volume/dữ liệu phát triển không bị xóa.
- [x] CRUD sản phẩm đúng `QT-A02`, `SP-01` đến `SP-08`, `SP-12`, `SP-15`; slug bất biến, giá/nhãn/tồn kho hợp lệ và đơn cũ không đổi.
- [x] Ảnh đúng `SP-02`, `SP-11`, `SP-13`, `NF-05`: bytes/type/size/count/tên ngẫu nhiên, thứ tự/ảnh chính đúng và không xóa file vật lý.
- [x] Biến thể đúng `SP-06`, `SP-07`, `SP-14`, `KHO-01`, `KHO-05`, `KHO-06`: unique, soft delete/restore đúng ID, còn ít nhất một dòng và stock không âm.
- [x] CRUD lookup đúng `QT-A03`, `SP-09`, `SP-10`; conflict nêu đúng số sản phẩm active/deleted và an toàn khi có race.
- [x] Mọi API mới tái sử dụng `authenticateAccessToken` + `requireRole("admin")`; ma trận 401/403/200 xanh và upload không chạy trước auth.
- [x] Danh sách xử lý ở database, 20 dòng/trang, không N+1; giao diện đủ loading/error/empty/success/confirm và URL query đúng.
- [x] Backend test/lint/coverage, frontend test/lint/build/coverage và integration PostgreSQL/filesystem đều xanh; không phá test xác thực hiện có.
- [x] `docker compose up --build` có đúng ba service healthy; upload volume sống qua recreate; dừng không `-v`.
- [x] Không có secret, path traversal, MIME spoof, raw HTML, debug log hay lỗi nội bộ lộ qua response.
- [x] README/AGENTS phản ánh dependency, route, upload và lệnh thực tế; plan được tick, điền kết quả trung thực và mỗi bước chạy được có commit riêng.

## Câu hỏi cần xác nhận

Khi người dùng nói **“duyệt plan”**, hiểu là đồng ý ba lựa chọn dưới đây; nếu muốn đổi, vui lòng nêu đúng số mục trước khi duyệt:

1. [x] **Danh tính biến thể:** `sizeId`/`colorId` của một dòng biến thể là bất biến; chỉ sửa tồn kho. Muốn đổi cặp thì xóa mềm dòng cũ và thêm cặp mới, hoặc khôi phục đúng dòng đã xóa. Cách này giữ an toàn cho tham chiếu đơn cũ và hoàn kho khi hủy.
2. [x] **Sản phẩm đã xóa:** plan chưa làm khôi phục sản phẩm; danh sách CRUD chỉ hiển thị sản phẩm chưa xóa. Slug và mọi dòng con vẫn được giữ, đúng `SP-08`/`SP-12`/`SP-13`.
3. [x] **Upload:** dùng `multer` + `file-type`, giới hạn 5 MiB = `5 * 1024 * 1024` bytes; dùng memory storage với trần tối đa 8 file/request rồi kiểm tra magic bytes trước khi ghi file UUID. Không thêm xử lý/nén ảnh.

## Kết quả sau khi làm

### Đã thực hiện

- Hoàn thành API Admin cho CRUD bốn nhóm lookup, danh sách/options/chi tiết/tạo/sửa/xóa mềm sản phẩm, quản lý ảnh và biến thể. Toàn bộ route mới nằm sau `authenticateAccessToken` + `requireRole("admin")`; danh sách tìm/lọc/sort/phân trang ở PostgreSQL và không dùng truy vấn N+1.
- Hoàn thành upload JPG/PNG/WebP bằng `multer` memory storage + `file-type`: kiểm tra magic bytes, 5 MiB/file, 8 file/request và 8 ảnh/sản phẩm, tên UUID, static `/uploads`, giữ file vật lý khi gỡ ảnh hoặc xóa mềm sản phẩm.
- Hoàn thành giao diện Admin dùng chung, CRUD danh mục/thuộc tính và các trang danh sách/thêm/sửa sản phẩm; filter nằm trên URL, form tạo dùng `FormData`, trang sửa quản lý core/ảnh/biến thể. Sidebar được đặt trực tiếp trong `AdminLayout.jsx` thay vì tách thêm `AdminSidebar.jsx`; chức năng và phạm vi không đổi.
- Không thêm/sửa migration hoặc schema. `AGENTS.md` đã ghi dependency upload; `README.md` đã ghi route Admin, hợp đồng multipart, giới hạn upload và volume ảnh.
- Khi kiểm tra tích hợp phát hiện request refresh trang catalog gửi thừa query `resource`; đã sửa để chỉ gửi `q`, `sort`, `page` và thêm test hồi quy.

### Đã kiểm thử

- Backend: `19` file test, `84/84` test đạt trên PostgreSQL 18 thật và thư mục upload tạm; coverage `91,25%` statements, `79,02%` branches, `96,94%` functions, `92,75%` lines; ESLint sạch.
- Frontend: `7` file test, `20/20` test đạt; coverage `71,04%` statements, `60,92%` branches, `64,44%` functions, `79,42%` lines; ESLint sạch; Vite production build thành công (`126` modules).
- Docker Compose build thành công và cả `db`, `backend`, `frontend` đều healthy. Smoke test xác nhận health DB, Customer nhận `403` ở API Admin, Admin tạo được sản phẩm multipart, hai route frontend trả `200`.
- Ảnh smoke test trả `200` trước và sau khi recreate riêng backend, đồng thời vẫn trả `200` sau khi xóa mềm sản phẩm. Đã chạy `docker compose down` không `-v`; hai volume `shoe-store-webapp_postgres_data` và `shoe-store-webapp_uploaded_images` vẫn còn. Container PostgreSQL test tạm đã dừng.
- Audit không thấy `.env` được theo dõi, `console.log` debug, `dangerouslySetInnerHTML`, TODO/FIXME trong source; migration, `docs/schema.md` và `docs/nghiep-vu.md` không bị thay đổi.

### Commit

- `adbeb73` — `chore: add product upload dependencies`
- `d162e92` — `feat: add admin product catalog management`
- `05bf5bf` — `feat: add admin product CRUD`
- `a2a41dc` — `feat: add product image management`
- `4a63936` — `feat: add product variant management`
- `d2758ad` — `feat: add admin catalog interface`
- `705b1be` — `feat: add admin product management interface`
- `d76b8b5` — `fix: refresh admin catalog with valid query`
- Bước 8/tài liệu: `docs: document admin product management`.

### Tồn đọng

- Không có tồn đọng chức năng trong phạm vi plan. Danh sách test tay ở trên vẫn nên được người dùng chạy như kiểm thử chấp nhận trên trình duyệt và dữ liệu phát triển của mình.
