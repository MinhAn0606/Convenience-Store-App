# Kiến trúc

```text
frontend/ (React + Vite) ──┐
                          ├── backend/ (Express /api) ── MongoDB
mobile/ (Expo JavaScript) ─┘
```

Giữ frontend/backend ở vị trí cũ; mobile là ứng dụng độc lập với dependency và lockfile riêng. Mobile phục vụ khách hàng, web tiếp tục hỗ trợ Guest/Customer/Staff/Admin. Cả hai dùng chung tài khoản, sản phẩm, giỏ hàng và đơn hàng. Không có kết nối MongoDB hoặc khóa merchant ở mobile.

Backend giữ quyền quyết định giá, khuyến mãi, tồn kho và trạng thái thanh toán. Đặt hàng là nhận tại cửa hàng, không giao hàng. Giá/tên sản phẩm trong đơn là snapshot để lịch sử không bị thay đổi theo catalog.

Các bổ sung:

- `customerOrder.controller.js` nối checkout service vào HTTP, phân trang/lọc đơn theo tài khoản, lịch sử và tracking.
- `accountProfile.controller.js` chỉ cho sửa họ tên/số điện thoại và đổi mật khẩu có kiểm tra mật khẩu cũ. Không nhận role, điểm hay trạng thái tài khoản từ client.
- Routes quản trị đơn sử dụng controller quản trị đã có, giữ nguyên URL web đang gọi.
- Stock service nhận MongoDB session khi chạy transaction; standalone vẫn dùng bù trừ. Chỉ replica set có đảm bảo transaction của MongoDB; bù trừ standalone không tương đương transaction khi tiến trình bị ngắt đột ngột.
- Mobile dùng React Navigation, SecureStore, fetch có timeout và xử lý 401, giữ idempotency key khi chưa biết kết quả request checkout.

JWT hiện có hạn một ngày, không có refresh token hay server-side revocation. Logout xóa token trên thiết bị; token đã sao chép vẫn có hiệu lực đến khi hết hạn. Thiết kế xác thực này được giữ để tương thích backend hiện tại.

Những module ngoài phạm vi mobile vẫn có placeholder: inventory, address, support, quản lý staff/customer, phần discount code và một số API quản trị. Profile web vẫn giữ nguyên giao diện placeholder; mobile đã có màn hình Profile riêng. Không tuyên bố toàn bộ website đã hoàn thiện.
