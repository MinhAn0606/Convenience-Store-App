# Kết quả kiểm tra trong môi trường cloud

- Cài backend và web từ lockfile bằng npm ci thành công.
- Mobile cài lại từ package-lock.json bằng npm ci thành công.
- Web Vite build thành công; còn cảnh báo bundle lớn hơn 500 kB của dự án gốc.
- Expo xuất bundle Hermes cho Android và iOS thành công.
- 12 bài kiểm thử mobile qua (màn hình và khôi phục/xóa phiên đăng nhập).
- Backend: 15 test qua trên MongoDB replica set và 15 test qua trên standalone (bao gồm test cha và 14 ca con). Bao phủ đăng ký/đăng nhập, giỏ hàng, tính giá, quyền sở hữu đơn, checkout/retry/đặt đồng thời, lịch sử, Profile, thanh toán mock, hết hạn và rollback kho.
- HTTP smoke: web HTML, Vite proxy, health, danh sách 15 sản phẩm demo, đăng nhập demo và GET Profile qua.
- MongoDB phát triển riêng chạy bằng Compose; backend, Vite và Metro đã khởi động trong phiên này. Live process không được đảm bảo giữ khi môi trường phục hồi.
- Metro phản hồi packager-status:running.
- Đối chiếu baseline: 306 file đã nhập đều còn; không có file web nào thay đổi. Năm file backend gốc được cập nhật có chủ đích: package.json, package-lock.json, stock.service.js, order.routes.js và profile.routes.js. Controller cũ vẫn được giữ, controller tích hợp mới được thêm riêng.

## Giới hạn

Chưa chạy trên thiết bị Android/iOS thật hoặc native simulator, chưa build APK/IPA, chưa kiểm tra merchant VNPay/MoMo thật. Mobile cần EXPO_PUBLIC_API_URL truy cập được từ thiết bị và client Expo tương thích SDK 54. Kết quả bundle không thay thế kiểm thử thiết bị.

Thanh toán đã kiểm tra bằng gateway mock, không khẳng định có giao dịch tiền thật. Callback hiện vẫn về trang web; người dùng đóng trình duyệt để quay lại app, trạng thái được đọc từ server. Một số module web/backend ngoài phạm vi mobile vẫn còn placeholder.

Expo kiểm tra dependency online không truy cập được dịch vụ; đối chiếu manifest SDK offline báo dependencies up to date. Tải binary MongoDB từ fastdl.mongodb.org bị proxy chặn; kiểm thử đã chuyển sang image MongoDB chính thức qua Docker, không tắt TLS/checksum.

install_script và start_skill đã được lưu vào draft môi trường; draft chưa được Publish và chưa kiểm tra phục hồi trong task mới.
