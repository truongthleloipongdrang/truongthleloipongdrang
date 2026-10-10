# HƯỚNG DẪN CÀI ĐẶT LƯU TRỰC TUYẾN – TRƯỜNG TH LÊ LỢI

## Mục đích
Giữ giao diện, dùng Firebase Authentication (email/password) và Cloud Firestore. Nút **Lưu Tất Cả Thay Đổi** lưu trực tiếp lên Firestore; mọi người tải lại trang sẽ đọc dữ liệu trực tuyến. Không dùng GitHub Token trong trình duyệt.

## 1. Tạo dự án Firebase
1. Vào https://console.firebase.google.com/ tạo dự án mới của trường.
2. Trong **Build → Authentication → Sign-in method**, bật **Email/Password**.
3. Trong **Authentication → Users**, tạo **một tài khoản quản trị riêng**, email thật và mật khẩu mạnh. Ghi lại **User UID** (không đưa UID vào bản web để làm quyền kiểm soát; UID chỉ dùng trong Firestore Rules).
4. Trong **Build → Firestore Database**, tạo cơ sở dữ liệu (Production mode).
5. Trong Project settings → General, thêm Web app. Ghi **apiKey** và **projectId** (hai giá trị nhận diện dự án này có thể hiển thị công khai; bảo mật phụ thuộc vào Firestore Rules và Firebase Auth). Không dùng service-account private key.

## 2. Áp dụng Security Rules (BẮT BUỘC)
Mở file `firestore.rules`, thay `REPLACE_WITH_FIREBASE_ADMIN_UID` bằng UID quản trị trong Firebase Authentication. Copy toàn bộ vào Firestore → Rules và nhấn **Publish**.
Không bao giờ dùng `allow write: if true`. Firestore Rules là lớp xác thực thực tế, không phải mật khẩu cũ trong JavaScript.

## 3. Cấu hình GitHub Actions
Vào repository → **Settings → Secrets and variables → Actions → Variables → New repository variable**. Tạo đúng ba biến:
- `VITE_FIREBASE_API_KEY`: Web API key từ Firebase project settings.
- `VITE_FIREBASE_PROJECT_ID`: Project ID.
- `VITE_FIREBASE_ADMIN_EMAIL`: email tài khoản quản trị (giống chính xác email Firebase Authentication).

File `.github/workflows/main.yml` đã được cập nhật để truyền các biến lúc build. Commit mã nguồn lên nhánh `main`, theo dõi tab **Actions** đến khi deploy thành công. Firebase API key không phải bí mật, **Firestore Rules mới là bắt buộc**. Tuyệt đối không đưa service-account private key hoặc GitHub PAT lên source/GitHub Actions variables.

## 4. Đăng nội dung lần đầu
1. Truy cập web sau khi deploy; nhấn Ctrl+K → mở đăng nhập quản trị.
2. Đăng nhập bằng **email Firebase và mật khẩu mới tạo** (không dùng `bgh_leloi` hoặc mật khẩu mặc định cũ).
3. Kiểm tra nội dung mẫu, chỉnh sửa nếu cần; bấm **Lưu Tất Cả Thay Đổi** và chờ thông báo **Đã lưu lên Firebase thành công**.
4. Mở website trong cửa sổ ẩn danh, tải lại và đối chiếu nội dung. Nếu báo `PERMISSION_DENIED`, kiểm tra UID/rules.
5. Firestore → Data cần có `siteData/publicContent` và `siteData/privateStudents`.

## 5. Bảo mật dữ liệu học sinh (QUAN TRỌNG)
- Danh sách, nhận xét học sinh được ghi riêng vào `privateStudents`, người truy cập ẩn danh **không được đọc**. Bản `public/site-content.json` trong ZIP này đã xóa danh sách học sinh.
- Chức năng tra cứu học sinh dành cho khách **không thể đọc dữ liệu riêng tư này**; cần triển khai thêm backend xác thực tra cứu phù hợp và rà soát quy định bảo vệ dữ liệu trẻ em trước khi mở lại. Không được mở quyền `privateStudents` thành công khai chỉ để tra cứu hoạt động.
- Nếu phiên bản cũ đã đưa dữ liệu học sinh lên GitHub public, cần xử lý dữ liệu đã lộ trong lịch sử repository và các bản sao lưu (xóa file hiện hành không xóa lịch sử git).
- Khi admin login, trang quản trị đọc danh sách học sinh riêng tư. Nội dung công khai không chứa danh sách học sinh.

## 6. Kiểm tra và giới hạn
- Không có kết nối hoặc Firebase lỗi: nút Lưu báo lỗi, không thông báo thành công giả.
- Chưa cấu hình variables: nút Lưu bị khóa. Phải triển khai sau khi cấu hình.
- Firebase/Firestore giới hạn kích thước document ~1 MiB. Ứng dụng kiểm soát payload dưới 900 KB; ảnh nên lưu ở kho riêng và dùng URL, không dán ảnh base64 trực tiếp trong nội dung.
- Cơ chế login lưu token trong RAM, tải lại trang phải đăng nhập lại (chủ ý bảo mật).
- Các thao tác sửa trực tiếp trên thẻ ngoài cửa sổ quản trị có thể cần đăng nhập và lưu trực tuyến; khi gặp lỗi phải quay lại quản trị để xử lý. Nút Lưu Tất Cả trong quản trị là luồng được ưu tiên và báo kết quả xác nhận.
- **Chưa triển khai thực tế**: người quản trị cần tạo Firebase, rules và GitHub Variables, rồi kiểm thử sau triển khai.
