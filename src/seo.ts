import { NavSection } from './types';

const CANONICAL_BASE_URL = 'https://truongthleloipongdrang.github.io/truongthleloipongdrang/';

const SECTION_SEO_TITLES: Record<NavSection, { title: string; desc: string }> = {
  home: {
    title: 'Trường Tiểu học Lê Lợi – Pơng Drang, Đắk Lắk',
    desc: 'Website Trường Tiểu học Lê Lợi, xã Pơng Drang, tỉnh Đắk Lắk. Cập nhật tin tức, thông báo, tuyển sinh lớp 1, hoạt động giáo dục và thông tin nhà trường.',
  },
  about: {
    title: 'Giới Thiệu Trường Tiểu học Lê Lợi – Pơng Drang, Đắk Lắk',
    desc: 'Tìm hiểu lịch sử hình thành, sứ mệnh, tầm nhìn, giá trị cốt lõi và cơ sở vật chất gồm trường chính Thôn Ea Tút cùng 2 phân hiệu của Trường Tiểu học Lê Lợi.',
  },
  staff: {
    title: 'Ban Giám Hiệu & Đội Ngũ Giáo Viên | Trường Tiểu học Lê Lợi',
    desc: 'Thông tin Ban Giám hiệu và đội ngũ giáo viên các tổ chuyên môn, tổ văn phòng tại Trường Tiểu học Lê Lợi, xã Pơng Drang, tỉnh Đắk Lắk.',
  },
  news: {
    title: 'Tin Tức & Thông Báo | Trường Tiểu học Lê Lợi Pơng Drang',
    desc: 'Cập nhật tin tức giáo dục, thông báo học vụ, thời khóa biểu, lịch kiểm tra và sự kiện mới nhất của Trường Tiểu học Lê Lợi, xã Pơng Drang, Đắk Lắk.',
  },
  activities: {
    title: 'Hoạt Động Giáo Dục & STEM | Trường Tiểu học Lê Lợi',
    desc: 'Các hoạt động dạy học, giáo dục STEM, trải nghiệm học đường, phong trào Đội TNTP, văn nghệ, thể thao và chuyển đổi số tại Trường Tiểu học Lê Lợi.',
  },
  admissions: {
    title: 'Tuyển Sinh Lớp 1 | Trường Tiểu học Lê Lợi Pơng Drang',
    desc: 'Thông tin tuyển sinh lớp 1 Trường Tiểu học Lê Lợi, xã Pơng Drang, tỉnh Đắk Lắk: đối tượng, chỉ tiêu, hồ sơ, lịch tiếp nhận và hotline 02623600344.',
  },
  'student-lookup': {
    title: 'Tra Cứu Học Sinh | Trường Tiểu học Lê Lợi Pơng Drang',
    desc: 'Chuyên mục tra cứu thông tin và đánh giá rèn luyện học sinh Trường Tiểu học Lê Lợi theo quy định bảo mật quyền riêng tư cho phụ huynh và học sinh.',
  },
  documents: {
    title: 'Tài Liệu Chuyên Môn & Học Liệu | Trường Tiểu học Lê Lợi',
    desc: 'Kho tài liệu chuyên môn, kế hoạch bài dạy, thời khóa biểu, văn bản chỉ đạo và học liệu dùng chung của Trường Tiểu học Lê Lợi, xã Pơng Drang, Đắk Lắk.',
  },
  gallery: {
    title: 'Thư Viện Ảnh | Trường Tiểu học Lê Lợi Pơng Drang',
    desc: 'Hình ảnh hoạt động dạy học, trải nghiệm, sự kiện nhà trường và khuôn viên Trường Tiểu học Lê Lợi tại Thôn Ea Tút, xã Pơng Drang, tỉnh Đắk Lắk.',
  },
  contact: {
    title: 'Liên Hệ & Địa Chỉ | Trường Tiểu học Lê Lợi Pơng Drang',
    desc: 'Địa chỉ Trường Tiểu học Lê Lợi: Thôn Ea Tút, xã Pơng Drang, tỉnh Đắk Lắk. Số điện thoại: 02623600344. Email: truongthleloipongdrang@gmail.com.',
  },
};

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

export function updatePageSeo(section: NavSection) {
  const seoInfo = SECTION_SEO_TITLES[section] || SECTION_SEO_TITLES.home;
  document.title = seoInfo.title;

  setMetaContent('meta[name="description"]', seoInfo.desc);
  setMetaContent('meta[property="og:title"]', seoInfo.title);
  setMetaContent('meta[property="og:description"]', seoInfo.desc);
  setMetaContent('meta[property="og:url"]', CANONICAL_BASE_URL);
  setMetaContent('meta[name="twitter:title"]', seoInfo.title);
  setMetaContent('meta[name="twitter:description"]', seoInfo.desc);
  setMetaContent('meta[name="twitter:url"]', CANONICAL_BASE_URL);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', CANONICAL_BASE_URL);
  }
}
