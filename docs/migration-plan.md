# Bảo toàn và migration

- Nguồn: Convenience-Store-E-commerce-Website.zip, SHA256 `fdca2db83a8bd741900077eca9ea0a981db8f5fc1e2f254ec665bc619f839338`.
- ZIP gốc và bản giải nén phân tích được giữ ngoài checkout trong môi trường làm việc. Không đụng database được cấu hình trong file .env gốc.
- Nhập 306 file từ frontend/backend; không nhập .git, .env, node_modules hoặc dist vào repository. Original README lưu tại `docs/ORIGINAL-README.md`. README và placeholder đã có ở repository đích được giữ.
- `source-baseline.json` lưu SHA256 từng file được nhập trước khi thay đổi. `scripts/verify-source-baseline.py` báo file thiếu và file thay đổi. Không có source gốc bị xóa.
- Web source, assets và lockfile giữ nguyên. Backend giữ controller placeholder gốc; thêm controller mới, điều chỉnh routes để gọi code mới hoặc controller admin đã có.
- Backend package/lockfile bổ sung dependencies được source gốc sử dụng và công cụ test. Stock service nhận session để checkout dùng transaction đúng với các thao tác kho.
- Không di chuyển collection, đổi model/schema, reset database hay chạy seed trên dữ liệu hiện tại.

## Triển khai an toàn

1. Backup MongoDB và xác minh phục hồi trước khi thay đổi môi trường thật.
2. Kiểm tra diff theo baseline; thử trên database phát triển/staging riêng.
3. Chạy test API, test mobile và build web/mobile theo development.md.
4. Kiểm tra cả website và điện thoại thật cùng API staging.
5. Cấu hình HTTPS API, JWT_SECRET riêng, merchant credentials và callback cho thanh toán thật; mock chỉ dùng phát triển.
6. Khi rollback, khôi phục phiên bản backend/web đã được kiểm tra. Không xóa dữ liệu và không dùng seed --reset. Các API mới không yêu cầu thay đổi schema cũ.

Không nhập lịch sử .git từ ZIP vào repository đích. Nếu cần giữ cả lịch sử dự án gốc trên GitHub, xử lý như một bước Git riêng sau khi kiểm tra credential trong lịch sử.
