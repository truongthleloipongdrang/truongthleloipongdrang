# Cổng Thông Tin Điện Tử Trường Tiểu Học Lê Lợi - Pơng Drang, Đắk Lắk

Website chính thức của **Trường Tiểu Học Lê Lợi**, Thôn Ea Tút, Xã Pơng Drang, Tỉnh Đắk Lắk.
- **GitHub Owner:** `truongthyjutpongdrang`
- **GitHub Repository:** `truongthleloipongdrang`
- **Đường dẫn GitHub Pages:** `https://truongthleloipongdrang.github.io/truongthleloipongdrang/`
- **Điện thoại:** 0944823366
- **Email:** truongthleloipongdrang@gmail.com

---

## 🌲 Đặc Điểm & Tính Năng Nổi Bật

1. **Giao diện hiện đại mang sắc màu đại ngàn Tây Nguyên:**
   - Phối màu xanh lá cây rừng thông, bazan đất đỏ và hoa cà phê tươi sáng, thân thiện học đường.
   - Tối ưu 100% hiển thị trên điện thoại, máy tính bảng và máy tính để bàn.
2. **Khả năng chỉnh sửa trực quan mọi thẻ trên website (Universal Card Editor):**
   - Dưới quyền quản trị, mọi thẻ thông tin (tin tức, giáo viên, ban giám hiệu, hoạt động, cơ sở vật chất, tài liệu, tuyển sinh...) đều có nút **✏️ Sửa thẻ này**.
   - Khi bấm sửa thẻ nào, hệ thống hiển thị chính xác nội dung thẻ đó kèm bản xem trước trực quan để tránh nhầm lẫn.
3. **Phím tắt quản trị bí mật (`Ctrl + K` hoặc `Cmd + K`):**
   - Hộp thoại đăng nhập quản trị chỉ mở ra khi bấm tổ hợp phím `Ctrl + K` (hoặc nhấn nút Quản trị kín đáo ở chân trang).
   - Mật khẩu ban đầu được băm mã hóa an toàn bằng thuật toán SHA-256 kèm salt (`Leloi@PongDrang2026#`), tuyệt đối không dùng `admin/admin` hay mật khẩu yếu.
   - Có chức năng đổi mật khẩu quản trị bất kỳ lúc nào.
4. **Cổng đăng nhập thành viên (Gmail):**
   - Luôn hiển thị nút "Đăng nhập thành viên (Gmail)" trên thanh điều hướng.
   - Phụ huynh, học sinh và thầy cô đăng nhập để tải tài liệu về máy và đóng góp học liệu lên kho.
   - Quản trị viên có thể xem và xuất danh sách (CSV) các tài khoản Gmail đã đăng nhập và lịch sử tải/gửi.
5. **Kho học liệu số dùng chung:**
   - Đầy đủ danh mục: Giáo án điện tử GDPT 2018, Đề thi & Đáp án, Văn bản thông tư, Tài liệu tập huấn, Bài giảng STEM và Học sinh ôn tập.
6. **Tra cứu học sinh an toàn, bảo vệ quyền riêng tư:**
   - Tra cứu theo mã học sinh hoặc lớp.
   - Tuyệt đối không lưu và không hiển thị CCCD, ngày sinh đầy đủ, hoặc địa chỉ chi tiết công khai. Chỉ hiển thị kết quả học tập và phong trào thi đua theo Thông tư 27 của Bộ GD&ĐT.
7. **Tích hợp Trí Tuệ Nhân Tạo (Gemini AI):**
   - Hỗ trợ giáo viên và Ban Giám hiệu viết mô tả, giới thiệu truyền cảm, chuẩn mực sư phạm.
   - Chạy an toàn qua server backend (`/api/generate-description`) hoặc cơ chế dự phòng thông minh khi chạy tĩnh trên GitHub Pages mà không làm lỗi ứng dụng.
8. **Chuẩn SEO Google & PWA:**
   - Thẻ Meta, OpenGraph, Twitter Card, Canonical URL, Favicon SVG, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, và Schema.org JSON-LD cho trường học.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử

### 1. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 2. Chạy thử nghiệm môi trường phát triển (Port 3000)
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:3000`

### 3. Kiểm tra lỗi (Linting) & Biên dịch sản phẩm (Build)
```bash
npm run lint
npm run build
```
Thư mục `dist/` sẽ được tạo ra với toàn bộ mã nguồn tĩnh tối ưu.

---

## 🌐 Triển Khai Lên GitHub Pages Tự Động

Website đã được cấu hình sẵn GitHub Actions (`.github/workflows/main.yml`) để tự động build và deploy mỗi khi có commit mới lên nhánh `main`.

### Các bước kích hoạt GitHub Pages trên Repository:
1. Vào repository trên GitHub: `https://github.com/truongthyjutpongdrang/truongthleloipongdrang`
2. Chọn tab **Settings** -> mục **Pages** (ở cột bên trái).
3. Tại phần **Build and deployment** -> **Source**: Chọn **GitHub Actions**.
4. Đẩy code lên nhánh `main`. GitHub Actions sẽ tự động cài đặt, build và phát hành website.
5. Sau 1-2 phút, website sẽ hoạt động tại:
   `https://truongthleloipongdrang.github.io/truongthleloipongdrang/`

---

## 🔒 Hướng Dẫn An Toàn & Bảo Mật

### 1. Giới hạn bảo mật khi chạy tĩnh trên GitHub Pages
- **GitHub Pages là môi trường hosting file tĩnh công khai (Static Web Hosting).**
- Vì vậy, bất kỳ mã nguồn frontend nào gửi về trình duyệt người dùng đều có thể đọc được.
- Quản trị trên giao diện web (localStorage) phù hợp để chỉnh sửa nội dung, xem trước và lưu trữ cục bộ.
- **Tuyệt đối không lưu trữ:** Khóa bí mật (Private Key), CCCD học sinh, mật khẩu dạng văn bản thô, hoặc Access Token toàn quyền lên frontend hoặc commit lên GitHub.

### 2. Cấu hình Gemini AI API Key an toàn
- Trên server/AI Studio: Đặt `GEMINI_API_KEY` trong bảng bí mật (Secrets) hoặc file `.env` trên máy chủ.
- **Tuyệt đối không** đặt tiền tố `VITE_` vào key (ví dụ: không dùng `VITE_GEMINI_API_KEY`) vì tiền tố này sẽ đóng gói API key trực tiếp vào file JavaScript gửi cho khách truy cập.
- Website gọi Gemini qua endpoint backend `/api/generate-description`.

### 3. Cấu hình GitHub Personal Access Token (tùy chọn)
- Nếu muốn lưu thay đổi trực tiếp từ giao diện Admin lên GitHub repo mà không cần mở máy tính gõ lệnh git:
  - Tạo **Fine-grained Personal Access Token** trên GitHub (chọn chỉ riêng repository `truongthleloipongdrang`).
  - Phân quyền tối thiểu: chỉ bật **Contents: Read and write**.
  - Nhập token vào mục "Sao Lưu & GitHub" trong bảng quản trị khi cần đồng bộ. Token chỉ lưu trong phiên làm việc, không lưu vào file công khai.

---

## 🔄 Cách Cập Nhật Nội Dung Dễ Dàng Bằng Google AI Studio

Bạn có thể chỉnh sửa website trực tiếp thông qua Google AI Studio:
1. Mở dự án trong Google AI Studio.
2. Yêu cầu AI bằng ngôn ngữ tự nhiên (xem chi tiết trong file `AI_INSTRUCTIONS.md` và `PROMPT_FOR_AI_STUDIO.md`).
3. Commit các thay đổi lên GitHub. GitHub Pages sẽ tự động cập nhật bản mới nhất cho toàn trường!
