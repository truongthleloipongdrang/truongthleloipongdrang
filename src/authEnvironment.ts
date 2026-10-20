import type { StudentRecord, AdmissionRegistration, FeedbackSubmission } from './types';

/**
 * XÁC ĐỊNH MÔI TRƯỜNG CHẠY HỆ THỐNG (ENVIRONMENT ISOLATION)
 * 
 * Mục tiêu bảo mật:
 * 1. Website chính (GitHub Pages / Production):
 *    - CHỈ SỬ DỤNG Firebase Authentication để đăng nhập quản trị.
 *    - Vô hiệu hóa và loại bỏ hoàn toàn cơ chế "Mật khẩu Nhà trường" khỏi production bundle.
 *    - Không tự động fallback, không cho phép bypass qua localStorage hoặc frontend password.
 * 2. Google AI Studio (Môi trường phát triển / xem trước):
 *    - Kích hoạt cổng "Mật khẩu Nhà trường" phục vụ xem trước và tinh chỉnh giao diện.
 *    - Tuyệt đối KHÔNG cấp quyền ghi/xóa vào Cloud Firestore Production.
 *    - Sử dụng dữ liệu giả lập (Mock Data) an toàn, không chứa thông tin học sinh thật.
 */

export function isTrustedPreviewEnvironment(): boolean {
  // A production bundle may never activate the local-password preview path,
  // irrespective of the domain on which that bundle is hosted.
  if (typeof __IS_PRODUCTION_BUILD__ !== 'undefined' && __IS_PRODUCTION_BUILD__) return false;
  if (import.meta.env.PROD || !import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;

  // Hostname is a *supplemental* development UX condition, NOT authentication.
  // Only a Vite DEV server may expose the mock preview experience.
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'github.io' || hostname.endsWith('.github.io')) return false;
  const local = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
  const aiStudioDev = hostname.endsWith('.run.app');
  return local || aiStudioDev;
}

export function isProductionWebsite(): boolean {
  return !isTrustedPreviewEnvironment();
}

/**
 * Dữ liệu giả lập mẫu (Mock Preview Data) cho chế độ xem trước Google AI Studio.
 * Đảm bảo 100% không rò rỉ hoặc chứa thông tin học sinh, phụ huynh thật.
 */
export const MOCK_PREVIEW_STUDENTS: StudentRecord[] = [
  {
    id: 'demo-preview-1',
    studentCode: 'THLL-PREVIEW-01',
    fullName: 'Nguyễn Văn Mẫu (Dữ liệu xem trước)',
    className: '1A',
    campus: 'Trường chính (Thôn Ea Tút)',
    academicYear: '2025-2026',
    academicEvaluation: 'Hoàn thành xuất sắc',
    conductEvaluation: 'Tốt',
    teacherName: 'Nguyễn Thị Hoa',
    awards: 'Cháu ngoan Bác Hồ (Mẫu)',
  },
  {
    id: 'demo-preview-2',
    studentCode: 'THLL-PREVIEW-02',
    fullName: 'Trần Thị Thử Nghiệm (Dữ liệu xem trước)',
    className: '2B',
    campus: 'Điểm trường Thôn 16',
    academicYear: '2025-2026',
    academicEvaluation: 'Hoàn thành tốt',
    conductEvaluation: 'Tốt',
    teacherName: 'Lê Văn Nam',
    awards: 'Học sinh Tiêu biểu (Mẫu)',
  },
  {
    id: 'demo-preview-3',
    studentCode: 'THLL-PREVIEW-03',
    fullName: 'Lê Hoàng Minh (Dữ liệu xem trước)',
    className: '5A',
    campus: 'Điểm trường Thôn Ea Tút',
    academicYear: '2025-2026',
    academicEvaluation: 'Hoàn thành xuất sắc',
    conductEvaluation: 'Tốt',
    teacherName: 'Phạm Thị Lan',
    awards: 'Giải Nhất Kể chuyện cấp trường (Mẫu)',
  },
];

export const MOCK_PREVIEW_ADMISSIONS: AdmissionRegistration[] = [
  {
    id: 'demo-adm-preview-1',
    parentName: 'Phụ huynh mẫu (Xem trước AI Studio)',
    phone: '0900000000',
    childName: 'Học sinh mẫu (Xem trước AI Studio)',
    birthYear: '2020',
    campusChoice: 'Trường chính (Thôn Ea Tút)',
    note: 'Hồ sơ minh họa phục vụ kiểm tra giao diện quản trị trong Google AI Studio',
    submittedAt: '2026-10-17 08:30:00',
    status: 'pending',
  },
  {
    id: 'demo-adm-preview-2',
    parentName: 'Lê Văn Thử Nghiệm',
    phone: '0901111111',
    childName: 'Lê Thị Minh Tâm',
    birthYear: '2020',
    campusChoice: 'Điểm trường Thôn 16',
    note: 'Đã tư vấn hồ sơ nhập học mẫu',
    submittedAt: '2026-10-16 14:15:00',
    status: 'contacted',
  },
];

export const MOCK_PREVIEW_FEEDBACK: FeedbackSubmission[] = [
  {
    id: 'demo-fb-preview-1',
    fullName: 'Người dân mẫu (Xem trước AI Studio)',
    phone: '0900000000',
    email: 'xem.truoc@aistudio.dev',
    message: 'Ý kiến mẫu minh họa trong môi trường phát triển và xem trước Google AI Studio.',
    submittedAt: '2026-10-17 09:00:00',
    status: 'pending',
  },
  {
    id: 'demo-fb-preview-2',
    fullName: 'Ban Đại diện Cha Mẹ Học Sinh (Mẫu)',
    phone: '0902222222',
    email: 'phuhuynh.mau@gmail.com',
    message: 'Đề xuất tăng cường thêm các hoạt động trải nghiệm kỹ năng sống cho các em học sinh.',
    submittedAt: '2026-10-15 16:40:00',
    status: 'resolved',
  },
];
