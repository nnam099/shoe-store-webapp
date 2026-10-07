# Agent Instructions

## Project

Website bán giày multi-brand.
Đồ án học phần Lập trình Web.

## Source of Truth

Thứ tự ưu tiên:

1. docs/spec/Dac_ta_nghiep_vu_Web_ban_giay_v1_3_hoan_thien_quy_tac.docx
2. resources/products/
3. docs/DECISIONS.md (khi tồn tại)
4. Code hiện tại trong repository
5. Đề xuất của coding agent

Không được thay đổi Business Rules chỉ để implementation dễ hơn.

## Approved Technology Stack

Frontend:
- ReactJS
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express.js
- REST API

Database:
- PostgreSQL

Authentication:
- JWT

Deployment:
- Docker Compose
- Hosting ở giai đoạn cuối

## Architecture Constraints

Không tự ý thêm:
- Microservices
- Redis
- Kubernetes
- GraphQL
- Online payment
- Voucher
- Wishlist
- Recommendation AI
- Các chức năng ngoài phạm vi đặc tả

Nếu cần thay đổi architecture hoặc business rule:
DỪNG implementation và báo lại để được review.

## Working Process

Mỗi hạng mục phải:

1. Đọc nghiệp vụ liên quan.
2. Đọc code hiện tại.
3. Lập Plan.
4. Không implementation khi Plan chưa được duyệt.
5. Sau khi Plan được duyệt mới code.
6. Chạy test/check liên quan.
7. Báo cáo những gì đã thay đổi.

Plan KHÔNG lưu vào repository.
Plan được trao đổi ngoài repo để review.

## Git Policy

Không commit các thay đổi nhỏ lẻ.

Chỉ commit sau khi hoàn thành và kiểm tra một hạng mục có ý nghĩa.

Ví dụ commit hợp lệ:

- feat: implement database schema
- feat: add product seed data
- feat: implement authentication
- feat: implement product catalog
- feat: implement shopping cart
- feat: implement checkout flow
- feat: implement order management

Không commit module đang làm dở.

Trước khi commit:
- chạy test/check liên quan;
- kiểm tra git diff;
- xác nhận hạng mục đã hoàn thành.

Không tự ý refactor code không liên quan tới task hiện tại.