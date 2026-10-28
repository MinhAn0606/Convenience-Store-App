# Chạy dự án

## Công cụ

- Node.js 22 LTS hoặc mới hơn (phiên làm việc này dùng Node 24).
- Docker và Docker Compose cho MongoDB local; hoặc MongoDB replica set/Atlas của riêng bạn.
- Mobile dùng Expo SDK 54, React 19.1 và React Native 0.81.5. Dùng development build hoặc Expo Go tương thích SDK 54; Expo Go mới hơn có thể không hỗ trợ SDK này. Web tiếp tục dùng React 18/Vite 5 độc lập.

## Cài dependencies

Chạy `npm ci` riêng trong `backend`, `frontend` và `mobile`. Không gộp lockfile hoặc đổi dependency web để khớp React Native.

## Database và backend

Từ thư mục gốc:

```sh
docker compose up -d --wait mongo
```

Tạo `backend/.env` từ `backend/.env.example`, cấu hình:

- `MONGODB_URI=mongodb://127.0.0.1:27017/convenience_store?replicaSet=rs0&directConnection=true`
- `JWT_SECRET`: chuỗi ngẫu nhiên riêng, không commit.
- `PORT=5000`
- `FRONTEND_URL=http://localhost:5173`
- `BACKEND_URL=http://localhost:5000`
- `PAYMENT_MOCK=true` chỉ khi phát triển; mock tự tắt trong production.

Trong `backend`, chạy `npm run init-db`, rồi `npm run dev`. Có thể kiểm tra bằng `GET /api/health`.

Chỉ dùng `npm run seed` trên database phát triển mới, đã kiểm tra đích kết nối. Không dùng `--reset` trên dữ liệu cần giữ. Các script seed orders/transactions/shifts có thao tác xóa dữ liệu; không tự chạy trong startup. Không nhập lại JSON lên database thật nếu chưa có backup.

Compose lưu dữ liệu trong volume `mongo_data`. `docker compose down` dừng dịch vụ và giữ volume; không dùng tùy chọn `-v` nếu cần giữ dữ liệu.

## Web

Trong `frontend`:

```sh
npm run dev
npm run build
```

Vite sử dụng cổng 5173, proxy `/api` về backend cổng 5000. Giao diện web và toàn bộ source gốc được giữ lại.

## Mobile

Sao chép `mobile/.env.example` thành `mobile/.env` và đặt `EXPO_PUBLIC_API_URL`:

- Điện thoại thật: `http://<IP-LAN-của-máy-chạy-backend>:5000/api` hoặc HTTPS API đã triển khai.
- Android emulator: `http://10.0.2.2:5000/api`.
- iOS simulator trên cùng máy: `http://localhost:5000/api`.

Sau đó, trong `mobile`:

```sh
npm start
# hoặc npm run android / npm run ios
```

Expo chạy trên cloud không làm localhost của cloud truy cập được từ điện thoại. Cần backend HTTPS truy cập được hoặc mạng/VPN được cấu hình phù hợp. URL `EXPO_PUBLIC_*` được đóng gói công khai, không đặt JWT_SECRET, MongoDB URI hay khóa thanh toán vào đây.

Nếu thử thanh toán trên điện thoại, `BACKEND_URL` của backend cũng phải truy cập được từ điện thoại. VNPay/MoMo thật cần merchant credentials, callback/IPN công khai và HTTPS.

Mobile mở link thanh toán trong trình duyệt hệ thống. Callback hiện vẫn dùng trang kết quả web để giữ tương thích. Sau thanh toán, đóng trình duyệt để trở lại app, app đọc lại trạng thái đơn từ backend; có nút cập nhật và tự cập nhật đơn chờ thanh toán. Chưa triển khai deep link tự quay về app. Không tin kết quả từ URL hay từ việc trình duyệt đóng.

## Kiểm thử

```sh
# Từ thư mục gốc: tạo container tạm, test trên DB tên ngẫu nhiên rồi xóa container.
./scripts/test-backend-docker.sh
TEST_STANDALONE=1 ./scripts/test-backend-docker.sh

cd mobile
npm test
npm run export

cd ../frontend
npm run build
```

`backend/npm test` sử dụng MongoMemoryReplSet nếu không có `TEST_MONGODB_URI`; lần đầu cần tải MongoDB từ fastdl.mongodb.org. Trong môi trường hạn chế mạng, ưu tiên script Docker phía trên. Nếu truyền `TEST_MONGODB_URI`, test vẫn luôn chọn database tên `convenience_test_<random>` và chỉ xóa database đó.

Kiểm tra tương thích dependency Expo offline bằng `EXPO_OFFLINE=1 npm run check`; đây là đối chiếu manifest SDK đã cài, không phải kiểm tra dịch vụ Expo online.

Chạy `python scripts/verify-source-baseline.py` từ thư mục gốc để liệt kê file thay đổi so với ZIP và phát hiện source gốc bị thiếu.
