import type { SiteContent } from './types';

export interface ActivityCategoryDef {
  id:
    | 'day-hoc'
    | 'ngoai-khoa'
    | 'doi-tntp'
    | 'van-nghe'
    | 'the-thao'
    | 'trai-nghiem'
    | 'chuyen-doi-so';
  label: string;
}

export const ACTIVITY_CATEGORIES: readonly ActivityCategoryDef[] = [
  { id: 'day-hoc', label: 'Dạy học & STEM' },
  { id: 'ngoai-khoa', label: 'Ngoại khóa' },
  { id: 'doi-tntp', label: 'Phong trào Đội' },
  { id: 'van-nghe', label: 'Văn nghệ' },
  { id: 'the-thao', label: 'Thể thao' },
  { id: 'trai-nghiem', label: 'Trải nghiệm' },
  { id: 'chuyen-doi-so', label: 'Chuyển đổi số' },
] as const;

export const GALLERY_CATEGORIES = [
  { id: 'hoat-dong', label: 'Hoạt động học đường' },
  { id: 'co-so-vat-chat', label: 'Cơ sở vật chất' },
  { id: 'su-kien', label: 'Sự kiện & Lễ hội' },
] as const;

export function getActivityCategoryLabel(categoryId: string): string {
  const found = ACTIVITY_CATEGORIES.find((c) => c.id === categoryId);
  return found ? found.label : categoryId || 'Hoạt động';
}

export function getGalleryCategoryLabel(categoryId: string): string {
  const found = GALLERY_CATEGORIES.find((c) => c.id === categoryId);
  return found ? found.label : categoryId.replace(/-/g, ' ');
}

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

export interface HttpsImageUrlValidation {
  valid: boolean;
  normalizedUrl?: string;
  isImageKit?: boolean;
  host?: string;
  error?: string;
}

/**
 * Kiểm tra URL hình ảnh hợp lệ:
 * - Bắt buộc dùng giao thức HTTPS (https://)
 * - Chặn tuyệt đối http://, javascript:, data:, blob:, file:, địa chỉ nội bộ/localhost
 * - Tự động nhận diện URL từ ImageKit.io (ik.imagekit.io)
 */
export function validateHttpsImageUrl(rawUrl: string | undefined | null): HttpsImageUrlValidation {
  if (typeof rawUrl !== 'string') {
    return { valid: false, error: 'Vui lòng nhập URL hình ảnh HTTPS (từ ImageKit.io).' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Vui lòng nhập URL hình ảnh HTTPS (từ ImageKit.io).' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL hình ảnh quá dài (tối đa 2048 ký tự).' };
  }

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
      error: 'URL không an toàn bị từ chối. Chỉ cho phép đường dẫn hình ảnh bắt đầu bằng https://.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'URL hình ảnh không đúng định dạng. Vui lòng dán liên kết đầy đủ bắt đầu bằng https://.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Chỉ cho phép URL HTTPS hợp lệ (bắt đầu bằng https://). Không chấp nhận http://.',
    };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.') || isPrivateOrLoopbackHost(parsed.hostname)) {
    return {
      valid: false,
      error: 'Tên miền URL hình ảnh không hợp lệ hoặc thuộc mạng nội bộ.',
    };
  }

  const lowerHost = parsed.hostname.toLowerCase();
  const isImageKit = lowerHost === 'ik.imagekit.io' || lowerHost.endsWith('.imagekit.io');

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    isImageKit,
    host: parsed.hostname,
  };
}

export interface YouTubeValidationResult {
  valid: boolean;
  isEmpty?: boolean;
  videoId?: string;
  embedUrl?: string;
  watchUrl?: string;
  error?: string;
}

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Kiểm tra và trích xuất ID video YouTube an toàn (chỉ chấp nhận HTTPS YouTube).
 * Hỗ trợ:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function parseYouTubeUrl(rawUrl: string | undefined | null): YouTubeValidationResult {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: true, isEmpty: true };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 1024) {
    return { valid: false, error: 'Đường dẫn video YouTube quá dài.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Link video YouTube không đúng định dạng (ví dụ: https://www.youtube.com/watch?v=...).',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Link video YouTube bắt buộc sử dụng giao thức https://.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const allowedHosts = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtube-nocookie.com',
    'youtube-nocookie.com',
  ]);

  if (!allowedHosts.has(host)) {
    return {
      valid: false,
      error: 'Chỉ hỗ trợ liên kết video từ YouTube (youtube.com hoặc youtu.be).',
    };
  }

  let videoId = '';
  const pathParts = parsed.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    videoId = pathParts[0] || '';
  } else if (parsed.pathname === '/watch') {
    videoId = parsed.searchParams.get('v') || '';
  } else if (
    pathParts.length >= 2 &&
    ['embed', 'shorts', 'live', 'v'].includes(pathParts[0])
  ) {
    videoId = pathParts[1] || '';
  }

  if (!YOUTUBE_ID_REGEX.test(videoId)) {
    return {
      valid: false,
      error: 'Không tìm thấy mã video YouTube hợp lệ trong đường dẫn. Vui lòng dán link video YouTube đầy đủ.',
    };
  }

  return {
    valid: true,
    isEmpty: false,
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Tách và kiểm tra nhiều URL hình ảnh (mỗi dòng 1 URL) để thêm hàng loạt vào album / hoạt động.
 */
export function parseMultipleImageUrls(rawText: string): {
  validUrls: string[];
  invalidLines: { line: string; error: string }[];
} {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const validUrls: string[] = [];
  const seen = new Set<string>();
  const invalidLines: { line: string; error: string }[] = [];

  for (const line of lines) {
    const check = validateHttpsImageUrl(line);
    if (check.valid && check.normalizedUrl) {
      if (!seen.has(check.normalizedUrl)) {
        seen.add(check.normalizedUrl);
        validUrls.push(check.normalizedUrl);
      }
    } else {
      invalidLines.push({
        line,
        error: check.error || 'URL HTTPS không hợp lệ.',
      });
    }
  }

  return { validUrls, invalidLines };
}

/**
 * Sắp xếp lại phần tử trong danh sách (lên, xuống, đưa lên đầu) không làm đột biến mảng gốc.
 */
export function moveArrayItem<T>(
  list: T[],
  index: number,
  direction: 'up' | 'down' | 'top'
): T[] {
  if (index < 0 || index >= list.length) return list;
  const copy = [...list];
  if (direction === 'top') {
    if (index === 0) return list;
    const [item] = copy.splice(index, 1);
    copy.unshift(item);
    return copy;
  }
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= copy.length) return list;
  const temp = copy[targetIndex];
  copy[targetIndex] = copy[index];
  copy[index] = temp;
  return copy;
}

/**
 * Ước tính kích thước JSON UTF-8 của siteData/publicContent (giới hạn Firestore Rules < 900.000 bytes).
 */
export function getPublicContentByteSize(content: SiteContent): number {
  const { students: _excluded, ...publicOnly } = content;
  const str = JSON.stringify(publicOnly);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return str.length;
}
