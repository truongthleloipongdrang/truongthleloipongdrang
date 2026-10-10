import { NavSection } from './types';

const SECTION_SEO_TITLES: Record<NavSection, { title: string; desc: string }> = {
  home: {
    title: 'Trường Tiểu Học Lê Lợi - Pơng Drang, Đắk Lắk | Cổng Thông Tin Điện Tử',
    desc: 'Cổng thông tin điện tử Trường Tiểu Học Lê Lợi, Xã Pơng Drang, Tỉnh Đắk Lắk. Môi trường giáo dục thân thiện, chất lượng cao giữa đại ngàn Tây Nguyên.',
  },
  about: {
    title: 'Giới Thiệu Lịch Sử, Sứ Mệnh & Cơ Sở Vật Chất | Tiểu Học Lê Lợi Pơng Drang',
    desc: 'Tìm hiểu lịch sử phát triển, sứ mệnh, tầm nhìn, giá trị cốt lõi và hệ thống cơ sở vật chất khang trang gồm trường chính và 2 phân hiệu của TH Lê Lợi.',
  },
  staff: {
    title: 'Ban Giám Hiệu & Đội Ngũ Giáo Viên | Trường Tiểu Học Lê Lợi - Đắk Lắk',
    desc: 'Đội ngũ Ban Giám hiệu tận tâm: Thầy Nguyễn Thanh Bình (Hiệu trưởng), Cô Đỗ Thị Phục, Thầy Trần Mạnh Thắng (Phó Hiệu trưởng) cùng tập thể thầy cô giáo yêu nghề.',
  },
  news: {
    title: 'Tin Tức & Thông Báo Mới Nhất | Trường Tiểu Học Lê Lợi Pơng Drang',
    desc: 'Cập nhật kịp thời tin tức giáo dục, thông báo học vụ, lịch thi, sinh hoạt chuyên môn và sự kiện nổi bật của thầy và trò trường Tiểu học Lê Lợi.',
  },
  activities: {
    title: 'Hoạt Động Giáo Dục, Trải Nghiệm & STEM | Tiểu Học Lê Lợi',
    desc: 'Tổng hợp các hoạt động dạy học tích hợp STEM, sinh hoạt Đội TNTP, câu lạc bộ cồng chiêng bản sắc và phong trào chuyển đổi số học đường.',
  },
  admissions: {
    title: 'Tuyển Sinh Lớp 1 Năm Học Mới | Trường Tiểu Học Lê Lợi - Pơng Drang',
    desc: 'Kế hoạch tuyển sinh vào lớp 1 trường Tiểu học Lê Lợi xã Pơng Drang: Đối tượng, chỉ tiêu, hồ sơ cần chuẩn bị và thời gian tiếp nhận chi tiết.',
  },
  'student-lookup': {
    title: 'Tra Cứu Thông Tin Học Sinh An Toàn | Trường Tiểu Học Lê Lợi',
    desc: 'Cổng tra cứu kết quả rèn luyện học tập và thi đua của học sinh theo mã định danh học đường an toàn, minh bạch, bảo vệ quyền riêng tư.',
  },
  documents: {
    title: 'Kho Tài Liệu, Giáo Án & Đề Thi | Trường Tiểu Học Lê Lợi Pơng Drang',
    desc: 'Kho học liệu số dành cho giáo viên và học sinh: Giáo án GDPT 2018, ma trận đề thi, thông tư văn bản và bài giảng điện tử tương tác.',
  },
  gallery: {
    title: 'Thư Viện Ảnh Hoạt Động & Cơ Sở Vật Chất | Tiểu Học Lê Lợi',
    desc: 'Hình ảnh chân thực về các hoạt động văn nghệ, thể thao, hội thi và vẻ đẹp rực rỡ của ngôi trường giữa vùng đất cà phê bạt ngàn Pơng Drang.',
  },
  contact: {
    title: 'Liên Hệ & Địa Chỉ Trường Tiểu Học Lê Lợi | Pơng Drang, Đắk Lắk',
    desc: 'Thông tin liên hệ Trường Tiểu học Lê Lợi: Xã Pơng Drang, Tỉnh Đắk Lắk. Hotline: 0944823366 - Email: truongthleloipongdrang@gmail.com.',
  },
};

export function updatePageSeo(section: NavSection) {
  const seoInfo = SECTION_SEO_TITLES[section] || SECTION_SEO_TITLES.home;
  document.title = seoInfo.title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', seoInfo.desc);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', seoInfo.title);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute('content', seoInfo.desc);
  }

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute('content', seoInfo.title);
  }

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) {
    twitterDesc.setAttribute('content', seoInfo.desc);
  }
}
