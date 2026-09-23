# Kế hoạch: Khách xem sản phẩm

- Ngày: 2026-09-24
- Trạng thái: Hoàn thành

## Mục tiêu

Xây dựng luồng công khai để Guest và Customer xem danh sách sản phẩm, tìm kiếm không dấu, lọc/sắp xếp/phân trang tại backend, mở chi tiết theo slug, chọn đúng biến thể size/màu, xem tồn kho của biến thể đang chọn và thêm vào giỏ. Giao diện bám `docs/design-reference.md`, responsive và không yêu cầu đăng nhập để xem sản phẩm.

## Phạm vi

- Làm:
  - API công khai `GET /api/products`, `GET /api/products/options`, `GET /api/products/:slug`; ba endpoint này không dùng `authenticateAccessToken` và không yêu cầu token.
  - Danh sách chỉ lấy sản phẩm chưa xóa mềm; tìm tên không phân biệt hoa thường/không dấu; lọc nhiều thương hiệu, loại, size, màu và khoảng giá hiệu lực; sắp xếp đủ bốn lựa chọn; cố định 12 sản phẩm/trang ở backend.
  - Dùng query string chia sẻ được: `q`, các khóa lặp `brandId`, `categoryId`, `sizeId`, `colorId`, `minPrice`, `maxPrice`, `sort`, `page`. OR giữa các giá trị cùng nhóm, AND giữa các nhóm; size và màu phải khớp trên cùng một biến thể chưa xóa và còn tồn kho.
  - Response danh sách có ảnh chính, tên, thương hiệu, loại, giá, giá khuyến mãi/giá hiệu lực, nhãn trang trí, `inStock` và metadata phân trang; không trả số lượng tồn chính xác hoặc danh sách biến thể ở endpoint danh sách.
  - Options lọc công khai chỉ gồm thương hiệu/loại gắn với sản phẩm đang bán và size/màu gắn với biến thể đang bán còn tồn kho; không gọi lại API Admin có bảo vệ quyền.
  - Chi tiết theo slug hiển thị thư viện ảnh, mô tả, chất liệu, thương hiệu, loại, giá, nhãn trang trí và mọi biến thể chưa xóa, kể cả biến thể tồn kho `0`; chỉ trang chi tiết trả `stockQuantity` theo biến thể.
  - Giao diện `/san-pham` gồm public header/footer, sidebar lọc, thanh đếm kết quả/sắp xếp, lưới card, phân trang và đủ loading/error/empty; mobile đổi sidebar thành vùng lọc đóng/mở.
  - Giao diện `/san-pham/:slug` gồm thư viện ảnh, chọn màu/size theo cặp biến thể hợp lệ, hiển thị tồn kho chính xác của biến thể đang chọn, chọn số lượng và nút “Thêm vào giỏ”. Biến thể hết hàng vẫn hiện nhưng mờ/không chọn được; sản phẩm không có hoặc đã xóa hiển thị trang 404.
  - Card sản phẩm chỉ có badge “Còn hàng”/“Hết hàng”, không hiện số lượng chính xác và không đưa bộ chọn biến thể lên danh sách. Badge trang trí “Mới”/“Bán chạy”/“Nổi bật” chỉ ánh xạ từ `badge_label` do Admin chọn.
  - Guest thêm giỏ vào `localStorage`, cộng dồn một dòng cho cùng biến thể và chặn tổng số lượng vượt tồn kho vừa tải. Customer đã đăng nhập thêm vào giỏ database qua endpoint giỏ riêng có xác thực; việc này không biến trang hoặc API xem sản phẩm thành tài nguyên cần đăng nhập.
  - Backend khi Customer thêm giỏ đọc lại sản phẩm/biến thể/tồn kho trong database và từ chối sản phẩm hoặc biến thể đã xóa, hết hàng hay tổng số lượng vượt kho. Giỏ không giữ chỗ tồn kho.
  - Tailwind CSS v4 theo token SẢI, card kính mờ/cobalt/mint, ảnh vuông lazy-loading, focus/disabled rõ ràng và văn bản tiếng Việt.
- Không làm (để sau):
  - Trang xem/sửa/xóa giỏ hàng, tổng tiền giỏ, checkout, đặt hàng hoặc đồng bộ tồn kho nền; đây là phạm vi `KH-06`/`KH-07` tiếp theo.
  - Đánh giá/nhận xét P2, gợi ý sản phẩm, wishlist, badge tự động, promotion theo thời gian hoặc bất kỳ thanh toán online nào.
  - Sửa CRUD Admin, upload ảnh, schema/migration hoặc tự tạo pipeline thumbnail/resize ảnh mới; danh sách chỉ tải lazy ảnh chính hiện có, không tải cả thư viện ảnh.
  - Cho frontend tự lọc, sắp xếp hay phân trang trên toàn bộ dữ liệu.

## Quy tắc nghiệp vụ liên quan

- `KH-04`: nội dung card, tìm kiếm/lọc/sắp xếp/phân trang ở backend, trạng thái rỗng, loại sản phẩm xóa mềm và query string.
- `KH-05`: chi tiết, thư viện ảnh, chọn màu/size, tồn kho biến thể, số lượng và thêm giỏ; 404 cho sản phẩm không còn bán.
- `SP-03`, `SP-04`: hiển thị giá khuyến mãi hợp lệ và dùng giá hiệu lực khi lọc/sắp xếp.
- `SP-07`: danh sách chỉ có trạng thái cấp sản phẩm; chi tiết hiển thị biến thể hết hàng nhưng làm mờ/không chọn được.
- `SP-08`, `SP-12`, `SP-14`, `SP-15`: loại dữ liệu xóa mềm, truy cập chi tiết bằng slug bất biến, không hiện biến thể xóa mềm và chỉ dùng nhãn Admin đã chọn.
- `GH-01` đến `GH-04`: một dòng mỗi biến thể, cộng dồn có giới hạn tồn kho, không giữ chỗ kho, Guest dùng localStorage và Customer dùng database.
- `UI-01` đến `UI-04`: danh sách xử lý tại backend, 12 sản phẩm/trang, responsive và đủ loading/error/empty.
- `NF-07`, `NF-08`, `NF-10`: query có phân trang/index phù hợp, ảnh card lazy-loading và title có nghĩa.

## Hợp đồng API dự kiến

- `GET /api/products`
  - Query: `q` tối đa 200 ký tự; `brandId`/`categoryId`/`sizeId`/`colorId` có thể lặp; `minPrice`/`maxPrice` là số nguyên VND không âm; `sort` thuộc `newest`, `price_asc`, `price_desc`, `name_asc`; `page` mặc định `1`, giá trị trang không hợp lệ trở về `1`.
  - `minPrice > maxPrice`, ID sai kiểu hoặc sort ngoài allowlist trả lỗi `400` theo error envelope chung.
  - Response: `{ products, pagination: { page, pageSize: 12, totalItems, totalPages } }`; trang vượt tổng số trang trả danh sách rỗng và metadata đúng.
- `GET /api/products/options`
  - Response: `{ brands, categories, sizes, colors }`, sắp xếp ổn định theo tên/giá trị hiển thị.
- `GET /api/products/:slug`
  - Response: `{ product }`; chỉ endpoint này trả `images` và `variants[].stockQuantity`; slug không tồn tại hoặc thuộc sản phẩm xóa mềm trả `404 PRODUCT_NOT_FOUND`.
- `POST /api/cart/items`
  - Chỉ dùng khi AuthContext hiện là Customer; giữ `authenticateAccessToken` + `requireRole("customer")` tại namespace giỏ hiện có.
  - Body `{ productVariantId, quantity }`, trong đó `quantity` là số lượng muốn cộng thêm. Service khóa giỏ/biến thể, cộng với dòng hiện tại và trả `409` nếu tổng vượt tồn kho thay vì âm thầm cắt giảm.
  - Guest không gọi endpoint này; cùng phép cộng/giới hạn được áp dụng vào localStorage dựa trên chi tiết vừa tải.

## Ảnh hưởng đến database

Không thay đổi schema và không tạo migration. Các bảng/cột/index hiện có đã đủ: `products.search_name` + GIN trigram cho tìm không dấu, index category/brand/giá/mới nhất, index biến thể size/màu còn hàng, `product_images`, `product_variants`, `carts`, `cart_items` và unique một dòng/biến thể.

Không sửa migration đã chạy. Nếu đo bằng `EXPLAIN` trên dữ liệu test cho thấy query mới cần index khác, đó là việc ngoài plan: dừng, cập nhật `docs/schema.md`/plan và xin xác nhận trước khi tạo migration mới.

## Các file sẽ tạo/sửa

### Backend

- `backend/src/app.js`: khởi tạo repository/service/controller storefront; tiếp tục dùng module cart hiện có cho Customer.
- `backend/src/routes/index.js`: mount `/products` công khai, không truyền hoặc gắn `authenticateAccessToken` cho router này.
- `backend/src/routes/product.routes.js`: route list/options/detail công khai và thứ tự route tránh coi `options` là slug.
- `backend/src/controllers/product.controller.js`: trả response/status theo hợp đồng API.
- `backend/src/services/product.service.js`: chuẩn hóa tìm kiếm, điều phối list/options/detail và lỗi 404.
- `backend/src/db/product.repository.js`: SQL tham số hóa cho filter/sort/count/detail, cùng biến thể cho size + màu, tổng hợp trạng thái tồn kho không N+1.
- `backend/src/schemas/product.schemas.js`: Zod cho query nhiều giá trị, khoảng giá, sort, page và slug.
- `backend/src/utils/public-product.js`: bổ sung DTO storefront tách summary không lộ số tồn khỏi detail có số tồn; giữ tương thích DTO Admin hiện tại.
- `backend/src/schemas/cart.schemas.js`: schema thêm một biến thể vào giỏ.
- `backend/src/routes/cart.routes.js`, `backend/src/controllers/cart.controller.js`: thêm `POST /items` dưới guard Customer hiện có.
- `backend/src/services/cart-item.service.js`: nghiệp vụ cộng dồn/chặn vượt kho cho Customer, tách khỏi quy tắc merge khi đăng nhập vốn được phép cap theo `GH-06`.
- `backend/src/db/cart.repository.js`: bổ sung query khóa/đọc/upsert cần cho add item, tái sử dụng transaction hiện có.
- `backend/tests/unit/product-query.test.js`: normalization/validation query, mặc định page và allowlist sort.
- `backend/tests/integration/public-products.test.js`: API công khai list/options/detail và các tổ hợp filter/sort/page/soft-delete/tồn kho.
- `backend/tests/integration/cart-items.test.js`: thêm giỏ Customer, phân quyền, cộng dồn và giới hạn tồn kho; giữ test merge hiện có.

### Frontend

- `frontend/src/App.jsx`: thêm hai route công khai `/san-pham` và `/san-pham/:slug`, không bọc `ProtectedRoute`.
- `frontend/src/api/products.api.js`: dựng query lặp và gọi API list/options/detail không token.
- `frontend/src/api/cart.api.js`: thêm lời gọi `POST /cart/items` cho Customer, giữ merge hiện có.
- `frontend/src/cart/guest-cart-storage.js`: thêm/cộng dồn một biến thể an toàn, không lưu giá, trả kết quả để UI báo vượt kho.
- `frontend/src/components/storefront/StorefrontLayout.jsx`, `StorefrontHeader.jsx`, `StorefrontFooter.jsx`: layout công khai responsive theo SẢI cho hai trang sản phẩm.
- `frontend/src/components/products/ProductCard.jsx`, `ProductStockBadge.jsx`: card, giá, badge trang trí/tồn kho và link chi tiết; không có số tồn/variant trên card.
- `frontend/src/components/products/ProductFilterSidebar.jsx`, `ProductSortBar.jsx`, `ProductPagination.jsx`: lọc desktop/mobile, đủ bốn sort và phân trang đồng bộ URL.
- `frontend/src/components/products/ProductGallery.jsx`, `ProductVariantPicker.jsx`: gallery và chọn đúng cặp size/màu/tồn kho/quantity accessible.
- `frontend/src/pages/products/ProductListPage.jsx`: state URL → API, apply/xóa filter, reset page khi đổi điều kiện và loading/error/empty.
- `frontend/src/pages/products/ProductDetailPage.jsx`: tải theo slug, 404, chọn biến thể và điều phối add giỏ Guest/Customer.
- `frontend/src/styles/global.css`: bổ sung token nền/surface/line/muted/ink và style dùng chung còn thiếu, không thêm UI library.
- `frontend/src/tests/ProductListPage.test.jsx`: URL query, request, card, sort, pagination và các trạng thái màn hình.
- `frontend/src/tests/ProductDetailPage.test.jsx`: gallery, variant hết hàng, tồn kho chính xác, quantity, 404 và add giỏ theo vai trò.
- `frontend/src/tests/GuestCartStorage.test.js`: một dòng/biến thể, cộng dồn, persistence và chặn vượt kho.
- `README.md`: ghi route và query công khai sau khi chức năng hoàn tất.

Không dự kiến cài dependency mới; dùng React/React Router/Tailwind/Zod/pg và test stack hiện có.

## Các bước thực hiện

- [x] **Bước 1: API danh sách và options công khai.**
  - Tạo schema, repository, service, controller/router và wiring cho list/options không auth.
  - Query count + page tại PostgreSQL, summary không lộ tồn kho chính xác, filter cùng biến thể và sort ổn định có tie-breaker `id`.
  - Viết unit/integration test list/options; chạy backend test liên quan và lint.
  - Commit: `feat: add public product catalog API`.
- [x] **Bước 2: API chi tiết sản phẩm công khai.**
  - Lấy sản phẩm active theo slug, ảnh theo position và toàn bộ biến thể active gồm stock `0`; không N+1.
  - Viết test detail/404/soft-delete/variant/stock; chạy backend test liên quan và lint.
  - Commit: `feat: add public product detail API`.
- [x] **Bước 3: Hoàn thiện thao tác thêm vào giỏ từ chi tiết.**
  - Thêm Customer cart item endpoint có auth ở namespace cart; mở rộng localStorage utility cho Guest.
  - Backend đọc lại và khóa biến thể, chặn tổng vượt kho/xóa mềm; Guest không lưu giá và chỉ kiểm tra theo snapshot detail, vì giỏ không giữ chỗ.
  - Viết backend integration + frontend unit test cho cộng dồn, giới hạn và persistence; chạy test/lint liên quan.
  - Commit: `feat: add product detail cart action`.
- [x] **Bước 4: Dựng layout công khai và trang danh sách.**
  - Dựng header/footer, token, card, stock/decorative badge, sidebar responsive, sort bar và pagination bằng Tailwind v4.
  - URL là nguồn state của q/filter/sort/page; nút “Áp dụng bộ lọc” cập nhật URL/request, “Xóa lọc” đưa về mặc định; sort/page cập nhật ngay.
  - Viết test loading/error/empty/results/query/mobile filter semantics; chạy frontend test, lint và build.
  - Commit: `feat: add public product listing page`.
- [x] **Bước 5: Dựng trang chi tiết và nối thêm giỏ.**
  - Gallery, giá, mô tả/chất liệu, chọn size/màu theo đúng cặp, disable biến thể hết hàng, stock/quantity và trạng thái add thành công/lỗi.
  - Guest ghi localStorage; Customer gọi cart API với token; cả hai không thể thêm tổng số lượng vượt tồn kho biết được. Route xem chi tiết vẫn công khai.
  - Viết test detail/404/selection/stock/add theo Guest/Customer; chạy frontend test, lint và build.
  - Commit: `feat: add public product detail page`.
- [x] **Bước 6: Kiểm tra toàn hệ thống và hoàn thiện tài liệu.**
  - Chạy toàn bộ backend/frontend test, integration PostgreSQL thật, coverage, lint và frontend build.
  - Chạy `docker compose up --build`, smoke test public API/UI không token và Customer cart; dừng bằng `docker compose down` không `-v`.
  - Audit SQL injection, XSS, response tồn kho, soft-delete, route auth, N+1, URL state, responsive/accessibility và debug log.
  - Cập nhật README, tick plan và điền “Kết quả sau khi làm”.
  - Commit: `docs: document public product browsing`.

Nếu phát sinh file/thay đổi ngoài các nhóm trên, cần dependency mới, cần đổi schema/index hoặc phải làm thêm trang giỏ hàng, dừng lại cập nhật plan và báo người dùng trước khi tiếp tục.

## Rủi ro và điểm cần bảo mật

- **Phạm vi auth:** product router phải công khai thật sự và không gọi `authenticateAccessToken`; chỉ `POST /cart/items` của Customer nằm sau auth/role guard. Test request không token và token rác vẫn xem sản phẩm được, còn cart Customer giữ 401/403 đúng nghĩa.
- **Rò rỉ tồn kho:** DTO list/options không chứa `totalStock`, `stockQuantity` hoặc variants. Tồn kho chính xác chỉ xuất hiện trong detail đúng `KH-05`; card chỉ suy ra boolean `inStock` đúng `SP-07`.
- **SQL injection/query abuse:** mọi query được Zod giới hạn kiểu/độ dài/số lượng ID, loại trùng; sort ánh xạ allowlist; SQL tham số hóa; ký tự `%`/`_` trong từ tìm kiếm không được biến thành wildcard ngoài ý muốn.
- **Đúng filter:** dùng `EXISTS`/query tương đương để size và màu cùng khớp trên một biến thể active có `stock_quantity > 0`; không join làm nhân bản product/count; summary stock tính trên các biến thể active.
- **Soft delete:** mọi list/detail/options/cart-add loại product/variant đã xóa; detail vẫn trả biến thể active stock `0` để hiển thị disabled.
- **Race tồn kho:** giỏ không giữ chỗ. Customer add khóa/đọc lại tồn kho trong transaction; Guest chỉ có thể kiểm tra tồn kho vừa tải và checkout sau này vẫn bắt buộc revalidate. Không trừ kho trong chức năng này.
- **Tiền:** frontend chỉ hiển thị số nguyên VND từ backend; filter/sort dùng `COALESCE(sale_price, price)`; không gửi/lưu giá khi thêm giỏ.
- **XSS/URL:** React render text, không dùng HTML thô; slug và query được encode; URL ảnh đi qua helper hiện có, không nhận đường dẫn filesystem từ client.
- **Hiệu năng:** fixed page size 12, count/query tại DB, aggregate theo tập thay vì N+1, dùng index đã duyệt; card chỉ tải lazy ảnh chính. Không tải toàn bộ sản phẩm để lọc phía browser.
- **UX/accessibility:** trạng thái focus, disabled, label/input, thông báo lỗi và vùng cập nhật add-cart có thể đọc được; filter mobile không khóa thao tác và selection size/màu không chỉ dựa vào màu sắc.

## Cách kiểm thử

### Test tự động backend

- List/options/detail truy cập được khi không có token; token sai không làm endpoint công khai trả 401.
- Tìm `giay the thao`, chữ hoa/thường và tên tiếng Việt có dấu cho kết quả `Giày Thể Thao`; ký tự wildcard được xử lý như ký tự tìm kiếm.
- Multi-value OR trong cùng nhóm; AND giữa brand/category/variant/price; size + màu chỉ match khi cùng một biến thể active còn hàng.
- Price range và price sort dựa trên giá hiệu lực; bốn sort đúng và ổn định khi trùng giá/tên/thời điểm.
- Mặc định/page sai là trang 1; đúng 12 dòng/trang; count không nhân bản vì nhiều ảnh/variant; trang vượt phạm vi rỗng.
- List loại product xóa mềm, không lộ exact stock; `inStock` đúng khi một/mọi biến thể hết; options loại dữ liệu không còn gắn với hàng đang bán theo phạm vi đã chốt.
- Detail đúng thứ tự ảnh, trả biến thể active gồm stock `0`, loại variant xóa mềm; missing/deleted slug trả error envelope 404.
- Customer cart-add kiểm tra 401/403/200, tạo giỏ lười, cộng một dòng, chặn quantity không nguyên/dương, tổng vượt stock, product/variant deleted và stock `0`; merge-on-login cũ không regress.

### Test tự động frontend

- Route `/san-pham` và `/san-pham/:slug` không bị `ProtectedRoute` chặn; document title đúng.
- URL ban đầu được parse thành request; apply/search/sort/page cập nhật URL; thay filter reset page; reload từ URL phục hồi state.
- Card có ảnh chính lazy, giá sale/gốc, badge trang trí từ API và đúng một badge “Còn hàng”/“Hết hàng”; không render số tồn hoặc variant.
- Hiển thị loading, retry/error, “Không tìm thấy sản phẩm”, count, pagination và filter mobile/desktop.
- Detail gallery/fallback, sale price, material/description; lựa chọn size/màu chỉ tạo đúng variant, stock `0` disabled, nút add disabled khi chưa chọn/hết hàng/quantity sai.
- Guest add tạo/cộng một localStorage row và giữ sau reload; vượt kho không ghi. Customer add gọi API có token và không ghi guest storage; lỗi 409 giữ lựa chọn để sửa.
- 404 sản phẩm có nội dung và đường quay lại danh sách; không render HTML thô từ dữ liệu API.

### Test tay người dùng nên chạy

1. Mở `/san-pham` ở cửa sổ ẩn danh; xác nhận không bị chuyển đăng nhập, card đúng thiết kế SẢI và không chỗ nào ở danh sách hiện số tồn chính xác.
2. Tìm một tên có dấu bằng chuỗi không dấu; phối hợp nhiều thương hiệu/loại/size/màu/khoảng giá, copy URL sang tab khác và xác nhận kết quả giữ nguyên.
3. Thử đủ “Mới nhất”, “Giá tăng dần”, “Giá giảm dần”, “Tên A-Z”; chuyển qua trang 2 với dữ liệu seed trên 12 sản phẩm rồi đổi filter để xác nhận về trang 1.
4. Thu nhỏ màn hình; mở/đóng vùng lọc, dùng card/grid/pagination bằng bàn phím và kiểm tra ảnh không làm vỡ bố cục.
5. Mở sản phẩm nhiều ảnh/biến thể; đổi size/màu, kiểm tra cặp hết hàng mờ/không chọn được, cặp còn hàng hiện đúng số và giới hạn quantity.
6. Khi chưa đăng nhập, thêm cùng biến thể hai lần rồi reload; xác nhận một dòng localStorage được cộng dồn và lần vượt kho bị chặn.
7. Đăng nhập Customer, thêm biến thể và kiểm tra `cart_items`; xác nhận không ghi guest storage mới. Thử Customer/Admin token trực tiếp với `POST /api/cart/items` để thấy lần lượt đúng quyền/403.
8. Xóa mềm product/variant bằng luồng Admin trên dữ liệu thử; xác nhận list/detail/cart-add loại đúng dữ liệu nhưng variant active stock `0` vẫn hiện disabled ở detail.
9. Chạy `docker compose up --build` trên viewport desktop/mobile, smoke test ảnh upload, refresh route trực tiếp qua Nginx và dừng bằng `docker compose down` không `-v`.

## Tiêu chí hoàn thành

- [x] Plan được người dùng nói rõ “duyệt plan” trước khi viết code; từng bước được tick, test và commit riêng.
- [x] Ba API product công khai không dùng `authenticateAccessToken`; route frontend không cần đăng nhập; cart Customer vẫn giữ backend auth đúng `GH-04`.
- [x] Tìm không dấu, multi-filter AND/OR, cùng biến thể size + màu, bốn sort và pagination 12 chạy đúng hoàn toàn ở PostgreSQL.
- [x] List/card không lộ số tồn; `inStock` đúng `SP-07`; detail hiện exact stock chỉ cho biến thể chọn và biến thể hết hàng vẫn hiện disabled.
- [x] Product/variant xóa mềm không xuất hiện sai chỗ; detail dùng slug và 404 đúng.
- [x] Guest/Customer thêm giỏ đúng nơi lưu, một dòng mỗi variant, cộng dồn không vượt kho và không trừ/giữ chỗ tồn kho.
- [x] UI đúng Tailwind v4/design reference, responsive, accessible cơ bản, có loading/error/empty/404 và URL filter chia sẻ được.
- [x] Backend/frontend test liên quan và toàn bộ test, lint, coverage, frontend build đều xanh; integration chạy trên PostgreSQL 18 thật.
- [x] `docker compose up --build` chạy được; smoke test API/UI/ảnh/cart đạt; không xóa volume/dữ liệu.
- [x] Không có migration/schema/dependency ngoài plan, secret, SQL nối chuỗi, raw HTML, N+1, debug log hoặc dữ liệu sản phẩm hardcode trong component.
- [x] README và mục “Kết quả sau khi làm” được cập nhật trung thực khi hoàn tất.

## Câu hỏi cần xác nhận

Khi người dùng nói **“duyệt plan”**, hiểu là đồng ý các lựa chọn sau; nếu muốn đổi, vui lòng nêu số mục trước khi duyệt:

1. [x] **Trang/API product công khai, cart theo vai trò:** không auth cho mọi thao tác xem. Guest thêm localStorage; chỉ khi đã là Customer thì nút add gọi `POST /api/cart/items` có auth để giữ đúng `GH-04`. Guard cart này không áp lên product router hoặc route trang.
2. [x] **Multi-select filter:** OR trong cùng một nhóm (ví dụ brand A hoặc B), AND giữa các nhóm; nếu có cả size và màu thì một biến thể phải đồng thời thuộc tập size, tập màu và còn hàng.
3. [x] **Cách áp dụng filter:** q/filter chỉ gọi API khi submit tìm kiếm hoặc bấm “Áp dụng bộ lọc”; sort và page áp dụng ngay. Tất cả vẫn được ghi vào URL, đổi điều kiện lọc reset `page=1`.
4. [x] **Ảnh danh sách:** dùng ảnh chính hiện có với `loading="lazy"`, tỷ lệ 1:1 và chỉ tải một ảnh/card. Không bổ sung `sharp`, file thumbnail hay sửa pipeline upload trong plan này; nếu yêu cầu tạo ảnh dẫn xuất thực sự, cần cập nhật plan và phạm vi upload trước khi code.

## Kết quả sau khi làm

### Đã thực hiện

- Hoàn thành API công khai list/options/detail dưới `/api/products` không gắn auth. Danh sách tìm không dấu, lọc multi-value OR/AND đúng cùng biến thể, lọc/sort theo giá hiệu lực, cố định 12 sản phẩm/trang và không trả số tồn chính xác.
- Hoàn thành detail theo slug với thư viện ảnh, biến thể active gồm dòng stock `0`, loại product/variant xóa mềm và 404 chuẩn. DTO detail mới trả tồn kho theo biến thể, còn DTO list chỉ trả boolean `inStock`.
- Hoàn thành `POST /api/cart/items` cho Customer dưới guard hiện có; service khóa giỏ/biến thể, cộng dồn và từ chối vượt kho. Guest dùng localStorage, một dòng mỗi biến thể, không lưu giá. Các query có sẵn trong `cart.repository.js` đã đủ nên không cần sửa file này.
- Hoàn thành layout công khai SẢI, card/badge tồn kho, sidebar responsive, đủ bốn sort, pagination, loading/error/empty, URL filter chia sẻ được, trang chi tiết/gallery/variant picker/quantity và add-cart theo vai trò.
- Cập nhật README với route UI, hợp đồng API/query và quy tắc tồn kho công khai. Không thêm dependency, migration hoặc thay đổi schema/nghiệp vụ.
- Integration thật phát hiện và đã sửa `ORDER BY` của query options dùng `DISTINCT`; đồng thời chỉnh fixture test để không bị pagination che kết quả và không vượt giới hạn cột size.

### Đã kiểm thử

- Backend trên PostgreSQL 18 trong Docker: `22/22` file, `99/99` test đạt, gồm public catalog/detail, soft-delete, cùng biến thể size+màu, cart authorization/stock/concurrency và toàn bộ test hồi quy. Coverage: `92,30%` statements, `80,40%` branches, `97,33%` functions, `93,66%` lines. ESLint sạch.
- Frontend: `10/10` file, `29/29` test đạt. Coverage: `75,08%` statements, `65,44%` branches, `69,06%` functions, `82,68%` lines. ESLint sạch và Vite production build thành công (`139` modules).
- `docker compose up --build` build thành công; `db`, `backend`, `frontend` đều healthy. Smoke test xác nhận health/list/options/detail, list đúng 12/trang không lộ exact stock, refresh trực tiếp hai route frontend trả `200`, Customer cart-add trả `200`, anonymous cart-add trả `401`.
- Đã dừng bằng `docker compose down` không `-v`; hai volume `shoe-store-webapp_postgres_data` và `shoe-store-webapp_uploaded_images` vẫn còn. Smoke test đã thêm một dòng vào giỏ của Customer seed trong database phát triển, không xóa dữ liệu nào.
- Audit không thấy migration/schema/dependency bị đổi, secret mới, SQL nối chuỗi từ input, `dangerouslySetInnerHTML`, `console.log`, TODO/FIXME hoặc auth middleware gắn nhầm vào product router.

### Commit

- `8f585af` — `feat: add public product catalog API`
- `b4d479b` — `feat: add public product detail API`
- `8061191` — `feat: add product detail cart action`
- `149045f` — `feat: add public product listing page`
- `41274b8` — `feat: add public product detail page`
- `96d2ca5` — `fix: correct public product integration queries`
- Bước 6/tài liệu: `docs: document public product browsing`.

### Tồn đọng

- Không còn tồn đọng code trong phạm vi plan. Người dùng vẫn nên chạy danh sách test tay ở trên để nghiệm thu cảm nhận thị giác và thao tác trên các thiết bị/viewport thực tế.
