# Bộ Mẫu Câu Lệnh Dành Cho Google AI Studio (Ready-To-Use Prompts)

Dưới đây là tập hợp các mẫu câu lệnh (prompts) được thiết kế riêng cho website **Trường Tiểu Học Lê Lợi - Pơng Drang, Đắk Lắk**. Quý thầy cô và quản trị viên chỉ cần sao chép (copy) và dán (paste) vào khung chat Google AI Studio khi muốn chỉnh sửa hoặc nâng cấp website.

---

## 1. 📝 Prompt Cập Nhật Nội Dung (Thông Tin Trường / Slogan / BGH)

```text
Hãy cập nhật thông tin nhà trường trong dự án Trường Tiểu Học Lê Lợi:
- Tên trường: Trường Tiểu Học Lê Lợi
- Địa chỉ: Thôn Ea Tút, Xã Pơng Drang, Tỉnh Đắk Lắk
- Số điện thoại: 0944823366
- Email: truongthleloipongdrang@gmail.com
- Khẩu hiệu giáo dục mới: "[NHẬP KHẨU HIỆU MỚI TẠI ĐÂY]"
- Cập nhật thông tin Hiệu trưởng: Thầy Nguyễn Thanh Bình (Quản lý trường chính)
- Cập nhật thông tin Phó hiệu trưởng: Cô Đỗ Thị Phục (Phân hiệu 1) và Thầy Trần Mạnh Thắng (Phân hiệu 2)
Hãy cập nhật đồng bộ trong src/data.ts và public/site-content.json, sau đó chạy kiểm tra build.
```

---

## 2. 📰 Prompt Cập Nhật & Đăng Tin Tức Mới

```text
Hãy thêm một bài viết tin tức mới vào mục Tin Tức của Trường Tiểu Học Lê Lợi:
- Tiêu đề: "[NHẬP TIÊU ĐỀ BÀI VIẾT]"
- Chuyên mục: "tin-tuc" (hoặc "thong-bao", "hoat-dong", "chuyen-doi-so")
- Ngày đăng: "[NGÀY ĐĂNG, VÍ DỤ: 28/09/2026]"
- Tác giả: "[TÊN TÁC GIẢ HOẶC BAN BIÊN TẬP]"
- Tóm tắt: "[1-2 CÂU TÓM TẮT NỘI DUNG]"
- Nội dung chi tiết: "[NỘI DUNG ĐẦY ĐỦ CỦA BÀI VIẾT]"
- Link ảnh minh họa: "[LINK ẢNH HOẶC CHỌN ẢNH MẪU PHÙ HỢP TỪ UNSPLASH VỀ GIÁO DỤC]"
- Đánh dấu tin nổi bật (Featured): true/false
Hãy thêm bài viết này lên đầu danh sách tin tức trong src/data.ts và kiểm tra lại giao diện đọc tin.
```

---

## 3. 🖼️ Prompt Thay Đổi Hình Ảnh Banner / Cơ Sở Vật Chất

```text
Hãy thay đổi hình ảnh cho website Trường Tiểu Học Lê Lợi:
- Thẻ/Mục cần đổi ảnh: "[VÍ DỤ: ẢNH BANNER TRANG CHỦ / ẢNH PHÂN HIỆU 1 / ẢNH THƯ VIỆN]"
- Đường dẫn ảnh mới: "[DÁN LINK ẢNH TẠI ĐÂY]"
- Chú thích ảnh (Alt text): "[MÔ TẢ NGẮN CỦA ẢNH PHỤC VỤ SEO GOOGLE]"
Hãy cập nhật trong file src/data.ts và đảm bảo ảnh tự động co giãn đúng tỉ lệ responsive trên điện thoại và máy tính, không bị méo ảnh.
```

---

## 4. 🔍 Prompt Tối Ưu Hóa & Cập Nhật SEO Google

```text
Hãy kiểm tra và cập nhật SEO Google cho website Trường Tiểu Học Lê Lợi:
- Đảm bảo từ khóa: "Tiểu Học Lê Lợi", "Trường Tiểu Học Lê Lợi Pơng Drang", "trường học tại Đắk Lắk", "tuyển sinh Tiểu Học Lê Lợi", "Thôn Ea Tút".
- Đồng bộ tiêu đề trang (Title), Meta Description, Canonical URL chính xác:
  https://truongthleloipongdrang.github.io/truongthleloipongdrang/
- Kiểm tra file public/sitemap.xml và public/robots.txt để đảm bảo tất cả đường dẫn URL đều chuẩn xác.
- Đảm bảo dữ liệu cấu trúc Schema.org JSON-LD cho trường học (EducationalOrganization) có đầy đủ tên Hiệu trưởng, địa chỉ và số điện thoại.
```

---

## 5. 📱 Prompt Kiểm Tra & Sửa Lỗi Hiển Thị Trên Điện Thoại (Mobile)

```text
Hãy rà soát toàn bộ giao diện website Trường Tiểu Học Lê Lợi trên thiết bị di động (Mobile Responsive):
1. Menu trượt trên điện thoại bấm mượt mà, không bị tràn ngang màn hình.
2. Các thẻ tin tức, ảnh hoạt động và bảng tra cứu học sinh hiển thị cân đối, cỡ chữ rõ ràng, dễ đọc trên màn hình nhỏ.
3. Nút đăng nhập thành viên (Gmail) và số điện thoại hotline bấm gọi nhanh không bị che khuất.
Sau khi chỉnh sửa, hãy chạy npm run build để kiểm tra.
```

---

## 6. 🔒 Prompt Kiểm Tra & Tăng Cường Bảo Mật

```text
Hãy thực hiện rà soát bảo mật toàn diện cho website Trường Tiểu Học Lê Lợi:
1. Đảm bảo KHÔNG có bất kỳ Gemini API key, GitHub token hay mật khẩu thô nào bị hardcode trong source code frontend hoặc file public.
2. Kiểm tra file .gitignore xem đã chặn đầy đủ các file nhạy cảm (.env, *.pem, secrets.json) chưa.
3. Đảm bảo mật khẩu quản trị được băm bằng SHA-256 an toàn và không bao giờ dùng tài khoản mặc định yếu (như admin/admin hay 123456).
4. Kiểm tra phần tra cứu học sinh: Tuyệt đối không để lộ CCCD, ngày sinh đầy đủ hay địa chỉ chi tiết công khai.
```

---

## 7. 🚀 Prompt Build & Deploy Lên GitHub Pages

```text
Hãy chuẩn bị và kiểm tra sẵn sàng để deploy website Trường Tiểu Học Lê Lợi lên GitHub Pages:
- Repo: truongthleloipongdrang (Owner: truongthyjutpongdrang)
- URL: https://truongthleloipongdrang.github.io/truongthleloipongdrang/
- Base trong vite.config.ts phải cấu hình đúng: "/truongthleloipongdrang/"
- Đảm bảo file .github/workflows/main.yml đã sẵn sàng.
- Hãy chạy lệnh "npm run lint" và "npm run build" để xác nhận bản build thành công 100% không có lỗi.
```

---

## 8. ✨ Prompt Thêm Giáo Viên Mới & Nhờ AI Viết Mô Tả

```text
Hãy thêm một thầy/cô giáo mới vào danh sách giáo viên Trường Tiểu Học Lê Lợi:
- Họ và tên: "[HỌ VÀ TÊN]"
- Chức danh: "[VÍ DỤ: GIÁO VIÊN CHỦ NHIỆM / TỔ TRƯỞNG CHUYÊN MÔN]"
- Phụ trách: "[VÍ DỤ: KHỐI 3 / MÔN TIẾNG ANH / MÔN MỸ THUẬT]"
- Điểm trường: "[TRƯỜNG CHÍNH / PHÂN HIỆU 1 / PHÂN HIỆU 2]"
- Trình độ: "Cử nhân Sư phạm"
- Hãy dùng tính năng AI tạo một đoạn mô tả (tiểu sử ngắn 3-4 câu) truyền cảm, thể hiện tinh thần nhiệt huyết vì học sinh thân yêu vùng đất Đắk Lắk.
- Thêm vào src/data.ts và kiểm tra kết quả hiển thị trên trang BGH - Đội ngũ.
```
