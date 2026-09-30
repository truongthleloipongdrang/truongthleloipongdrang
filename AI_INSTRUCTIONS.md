# Hướng Dẫn Dành Cho Trí Tuệ Nhân Tạo (AI Instructions)

Tài liệu này quy định các nguyên tắc bắt buộc khi bất kỳ mô hình AI nào (Google AI Studio, Cursor, Copilot, v.v.) được người dùng yêu cầu chỉnh sửa hoặc nâng cấp website **Trường Tiểu Học Lê Lợi - Pơng Drang, Đắk Lắk**.

---

## 📌 1. Thông Tin Nhận Diện Cốt Lõi Của Dự Án

- **Tên trường:** Trường Tiểu Học Lê Lợi
- **Địa chỉ:** Thôn Ea Tút, Xã Pơng Drang, Tỉnh Đắk Lắk
- **Số điện thoại:** 0944823366
- **Email:** truongthleloipongdrang@gmail.com
- **Ban Giám Hiệu:**
  - **Thầy Nguyễn Thanh Bình:** Hiệu trưởng - Quản lý điều hành toàn diện & Phụ trách trường chính
  - **Cô Đỗ Thị Phục:** Phó Hiệu trưởng - Phụ trách chuyên môn & Quản lý Phân hiệu 1
  - **Thầy Trần Mạnh Thắng:** Phó Hiệu trưởng - Phụ trách cơ sở vật chất, phong trào Đội & Quản lý Phân hiệu 2
- **GitHub Owner:** `truongthyjutpongdrang`
- **GitHub Repo:** `truongthleloipongdrang`
- **GitHub Pages URL:** `https://truongthleloipongdrang.github.io/truongthleloipongdrang/`
- **Cấu hình Base Vite:** `base: '/truongthleloipongdrang/'` (cho build GitHub Pages)

---

## ⚠️ 2. Quy Tắc Bắt Buộc Trước & Trong Khi Sửa Đổi

1. **Đọc dự án trước khi sửa:**
   - Luôn kiểm tra các file dữ liệu chính `src/data.ts`, `src/types.ts`, `src/App.tsx`, `public/site-content.json` trước khi thay đổi.
2. **Không xóa các file cấu hình quan trọng:**
   - Tuyệt đối không xóa hoặc làm hỏng `.github/workflows/main.yml`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `public/favicon.svg`, `public/sitemap.xml`, `public/robots.txt`, `public/404.html`.
3. **Giữ vững tính tương thích với GitHub Pages:**
   - Khi build, base đường dẫn bắt buộc phải là `/truongthleloipongdrang/`.
   - Không được dùng các router đòi hỏi server redirect phức tạp mà không có fallback SPA (`404.html`).
4. **Bảo mật tuyệt đối:**
   - Không được hardcode bất kỳ API Key, Gemini Key hay GitHub Token nào vào file mã nguồn frontend.
   - Không đưa API key thật vào `.env.example` hoặc các file trong thư mục `public/`.
5. **Sửa đúng nơi quy định:**
   - Sửa nội dung trường học (tin tức, giáo viên, tuyển sinh, tài liệu, cơ sở vật chất): Sửa trong `src/data.ts` và đồng bộ vào `public/site-content.json`.
   - Nâng cấp giao diện hoặc logic: Sửa component tương ứng trong `src/components/`.

---

## 🛠️ 3. Danh Mục File Chính & Chức Năng

| Đường Dẫn File | Mục Đích |
|---|---|
| `src/data.ts` | Nguồn dữ liệu mặc định của toàn bộ trường học (BGH, giáo viên, tin tức, học sinh, tài liệu, tuyển sinh). |
| `src/types.ts` | Định nghĩa kiểu dữ liệu TypeScript cho toàn bộ hệ thống. |
| `src/siteContentSync.ts` | Xử lý lưu trữ dữ liệu, băm mật khẩu SHA-256, xuất nhập JSON và đồng bộ GitHub REST API. |
| `src/geminiConfig.ts` | Cấu hình gọi AI viết mô tả giáo viên qua backend hoặc bộ sinh thông minh offline. |
| `server.ts` | Server Express backend phục vụ Gemini API an toàn và dev server Vite. |
| `src/components/EditCardModal.tsx` | Bộ chỉnh sửa trực quan (Universal Card Editor) cho phép sửa bất kỳ thẻ nào trên trang. |
| `src/components/AdminModal.tsx` | Bảng điều khiển quản trị toàn diện (kích hoạt bằng phím tắt `Ctrl + K`). |
| `src/components/Navbar.tsx` & `Footer.tsx` | Điều hướng responsive và thông tin chân trang chuẩn mực. |
| `public/sitemap.xml` & `robots.txt` | Cấu hình SEO Google Index cho website. |
| `.github/workflows/main.yml` | Workflow GitHub Actions tự động build và deploy lên GitHub Pages. |

---

## 📋 4. Quy Trình Kiểm Tra Bắt Buộc Sau Khi Sửa

Mỗi khi AI hoàn thành một tác vụ, bắt buộc phải:
1. Chạy `npm run lint` để kiểm tra lỗi TypeScript.
2. Chạy `npm run build` để đảm bảo dự án biên dịch thành công 100% không có cảnh báo nghiêm trọng.
3. Báo cáo rõ ràng:
   - Danh sách file đã được tạo hoặc sửa đổi.
   - Tóm tắt tính năng mới hoặc nội dung đã cập nhật.
   - Cách người dùng kiểm tra lại trên giao diện.
