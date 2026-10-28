# Hợp đồng API web và mobile

Base URL có hậu tố `/api`. Request/response JSON, lỗi có `message`; một số lỗi checkout có `code`, `summary` hoặc `issues`. API riêng tư dùng `Authorization: Bearer <token>`.

| Chức năng | API | Kết quả chính |
|---|---|---|
| Đăng ký | POST /auth/register | `{token,user}`; fullName/email/password/phone? |
| Đăng nhập | POST /auth/login | `{token,user}` |
| Phiên hiện tại | GET /auth/me | user rút gọn |
| Đăng xuất | POST /auth/logout | Client xóa token |
| Danh mục | GET /categories | Danh sách danh mục |
| Sản phẩm | GET /products?q=&categoryId=&page=&limit= | `{items,total,page,limit}` |
| Chi tiết sản phẩm | GET /products/:id | Product |
| Giỏ hàng | GET /cart | `{items,itemCount,subtotal,issues}` |
| Thêm giỏ | POST /cart/items | Body `{productId,quantity}`; trả giỏ mới |
| Sửa giỏ | PUT /cart/items/:productId | Body `{quantity}`; trả giỏ mới |
| Xóa khỏi giỏ | DELETE /cart/items/:productId | Giỏ mới |
| Xem trước đơn | POST /orders/preview | Body `{discountCode?}`; tổng tiền/issues/canCheckout/store |
| Đặt hàng | POST /orders | Body `{paymentMethod,discountCode?,customerNote?,expectedTotal?}`, header `Idempotency-Key`; `{order,replayed}` |
| Danh sách đơn | GET /orders/my?status=&page=&limit=&active=1 | `{items,total,page,limit,counts,store,summary}` |
| Lịch sử đã kết thúc | GET /orders/my/history?status=&from=&to=&page=&limit= | completed/failed; summary.completedCount/totalSpent theo khoảng ngày |
| Chi tiết/theo dõi | GET /orders/my/:id hoặc /orders/my/:id/tracking | Đơn thuộc user, items/store/statusHistory/latestPayment/serverTime |
| Link thanh toán | POST /payments/online | Body `{orderId,method:'vnpay'|'momo'}`; paymentUrl |
| Profile | GET /profile | Thông tin an toàn, không passwordHash |
| Sửa Profile | PUT /profile | `{fullName?,phone?}` |
| Đổi mật khẩu | PUT /profile/password | `{currentPassword,newPassword}` |

Danh sách `/orders/my` mặc định chứa mọi trạng thái để giữ tương thích các tab web; mobile truyền `active=1` cho mục đang xử lý.

Đặt hàng và giỏ hàng dành cho role customer. Tất cả truy vấn đơn customer đều lọc theo customerId lấy từ JWT. Đơn không thuộc tài khoản trả 404. `/orders/my/history` phải được đăng ký trước `/orders/my/:id`.

Cash tạo đơn `confirmed/unpaid`, thu tiền tại cửa hàng. VNPay/MoMo tạo `pending_payment/unpaid`; thanh toán chỉ chuyển thành công sau xác thực gateway. Đơn hết hạn được job backend xử lý và hoàn kho.

Idempotency key phải được giữ nguyên khi timeout/mất kết nối và gửi lại cùng lần đặt hàng. Backend chấp nhận header hiện có của web và body idempotencyKey để tương thích. Không tạo key mới chỉ vì chưa nhận được response.
