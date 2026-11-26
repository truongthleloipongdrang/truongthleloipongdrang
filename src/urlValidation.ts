import type { DocumentItem, StudentRecord } from './types';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  host?: string;
  error?: string;
}

export const ALLOWED_DOCUMENT_FILE_TYPES = [
  'PDF',
  'DOCX',
  'DOC',
  'XLSX',
  'PPTX',
  'ZIP',
  'PDF / DOCX',
  'Link trực tuyến',
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentItem['category'], string> = {
  'giao-an': 'Giáo Án & Phân Phối',
  'de-thi': 'Đề Thi & Đáp Án',
  'van-ban': 'Thông Tư & Văn Bản',
  'tap-huan': 'Tài Liệu Tập Huấn',
  stem: 'Bài Giảng STEM',
  'hoc-sinh': 'Học Sinh Ôn Luyện',
  'chuyen-de': 'Chuyên Đề Bồi Dưỡng',
  'ke-hoach': 'Kế Hoạch Giáo Dục',
};

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(lower)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(lower)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(lower)) return true;
  return false;
}

/**
 * Kiểm tra tính hợp lệ và an toàn của liên kết tài liệu:
 * - Chỉ chấp nhận giao thức http:// hoặc https://
 * - Chặn tuyệt đối javascript:, data:, vbscript:, file:, blob:
 * - Chặn đường dẫn rỗng, "#", hoặc trỏ tới địa chỉ nội bộ (localhost / LAN)
 */
export function validateDocumentUrl(rawUrl: string | undefined | null): UrlValidationResult {
  if (typeof rawUrl !== 'string') {
    return { valid: false, error: 'Tài liệu chưa có tệp đính kèm.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#') {
    return { valid: false, error: 'Tài liệu chưa có tệp đính kèm.' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'Đường dẫn tài liệu quá dài (tối đa 2048 ký tự).' };
  }

  // Chặn sớm các scheme nguy hiểm kể cả khi có khoảng trắng hoặc chữ hoa
  const compactLower = trimmed.replace(/\s+/g, '').toLowerCase();
  if (
    compactLower.startsWith('javascript:') ||
    compactLower.startsWith('data:') ||
    compactLower.startsWith('vbscript:') ||
    compactLower.startsWith('file:') ||
    compactLower.startsWith('blob:')
  ) {
    return {
      valid: false,
      error: 'Liên kết không an toàn bị từ chối. Chỉ chấp nhận đường dẫn https:// hoặc http:// hợp lệ.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Đường dẫn tài liệu không đúng định dạng URL (cần bắt đầu bằng https:// hoặc http://).',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Chỉ cho phép liên kết sử dụng giao thức https:// hoặc http://.',
    };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.') || isPrivateOrLoopbackHost(parsed.hostname)) {
    return {
      valid: false,
      error: 'Tên miền trong liên kết tài liệu không hợp lệ hoặc không được phép truy cập công khai.',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    host: parsed.hostname,
  };
}

export interface DocumentSubmissionInput {
  title: string;
  category: DocumentItem['category'];
  description: string;
  fileType: string;
  fileSize: string;
  downloadUrl: string;
}

export function validateDocumentSubmissionInput(
  input: DocumentSubmissionInput
): { valid: true; cleaned: DocumentSubmissionInput & { categoryLabel: string } } | { valid: false; error: string } {
  const title = (input.title || '').trim();
  const description = (input.description || '').trim();
  const fileType = (input.fileType || 'Link trực tuyến').trim();
  const fileSize = (input.fileSize || 'Liên kết trực tuyến').trim();

  if (title.length < 5 || title.length > 200) {
    return { valid: false, error: 'Tiêu đề học liệu cần từ 5 đến 200 ký tự.' };
  }

  if (description.length < 5 || description.length > 1000) {
    return { valid: false, error: 'Mô tả tóm tắt học liệu cần từ 5 đến 1000 ký tự.' };
  }

  const categoryLabel = DOCUMENT_CATEGORY_LABELS[input.category];
  if (!categoryLabel) {
    return { valid: false, error: 'Chuyên mục tài liệu không hợp lệ.' };
  }

  if (fileType.length < 2 || fileType.length > 30) {
    return { valid: false, error: 'Định dạng tài liệu không hợp lệ.' };
  }

  if (fileSize.length > 30) {
    return { valid: false, error: 'Thông tin dung lượng không được vượt quá 30 ký tự.' };
  }

  const urlCheck = validateDocumentUrl(input.downloadUrl);
  if (!urlCheck.valid || !urlCheck.normalizedUrl) {
    return { valid: false, error: urlCheck.error || 'Liên kết tài liệu không hợp lệ.' };
  }

  return {
    valid: true,
    cleaned: {
      title,
      category: input.category,
      categoryLabel,
      description,
      fileType,
      fileSize,
      downloadUrl: urlCheck.normalizedUrl,
    },
  };
}

/**
 * Tạo document ID ổn định, không trùng lặp cho collection studentResults/{studentId}
 * dựa trên mã học sinh (studentCode) đã chuẩn hóa. Chạy di chuyển nhiều lần luôn ghi đè đúng bản ghi đó.
 */
export function toSafeStudentResultDocId(
  student: Pick<StudentRecord, 'id' | 'studentCode'>
): string {
  const raw = (student.studentCode || student.id || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (raw.length >= 2 && raw.length <= 64) {
    return raw;
  }

  const fallback = (student.id || 'HS')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return fallback.length >= 2 ? fallback : `HS-${Date.now()}`;
}
