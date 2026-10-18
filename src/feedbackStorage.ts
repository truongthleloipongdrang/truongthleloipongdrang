import * as XLSX from 'xlsx';
import { FeedbackSubmission } from './types';
import { playNotificationChime } from './admissionsStorage';
import {
  createFeedbackInFirestore,
  fetchFeedbackFromFirestore,
  updateFeedbackStatusInFirestore,
  deleteFeedbackFromFirestore,
  isFirebaseConfigured,
  isOnlineAuthenticated,
} from './onlineStore';
import { isTrustedPreviewEnvironment, MOCK_PREVIEW_FEEDBACK } from './authEnvironment';

export const FEEDBACK_STORAGE_KEY = 'th_leloi_feedback_submissions';
export const DELETED_FEEDBACK_IDS_KEY = 'th_leloi_deleted_feedback_ids';
export const FEEDBACK_UPDATE_EVENT = 'th_leloi_feedback_update';
export const NEW_FEEDBACK_NOTIFICATION_EVENT = 'th_leloi_new_feedback_notification';

export const SAMPLE_FEEDBACK_SUBMISSIONS: FeedbackSubmission[] = [];

// Multi-tab BroadcastChannel for real-time feedback sync
const FEEDBACK_BC_NAME = 'th_leloi_feedback_channel';
let feedbackChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && !isTrustedPreviewEnvironment() && 'BroadcastChannel' in window) {
    feedbackChannel = new BroadcastChannel(FEEDBACK_BC_NAME);
    feedbackChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === 'new_feedback' && msg.payload) {
        const current = getStoredFeedback();
        if (!current.some((f) => f.id === msg.payload.id)) {
          const updated = [msg.payload, ...current];
          try {
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: updated }));
          playNotificationChime();
          window.dispatchEvent(
            new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: msg.payload })
          );
        }
      } else if (msg?.type === 'update_feedback' && Array.isArray(msg.payload)) {
        try {
          localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(msg.payload));
        } catch {}
        window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: msg.payload }));
      }
    };
  }
} catch {}

function getDeletedFeedbackIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_FEEDBACK_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function recordDeletedFeedbackId(id: string) {
  try {
    const set = getDeletedFeedbackIds();
    set.add(id);
    localStorage.setItem(DELETED_FEEDBACK_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getStoredFeedback(): FeedbackSubmission[] {
  // Chế độ xem trước AI Studio: luôn sử dụng dữ liệu mẫu riêng biệt
  if (isTrustedPreviewEnvironment()) {
    return MOCK_PREVIEW_FEEDBACK;
  }
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi đọc ý kiến đóng góp từ localStorage', err);
  }
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(SAMPLE_FEEDBACK_SUBMISSIONS));
  } catch {}
  return SAMPLE_FEEDBACK_SUBMISSIONS;
}

export function saveFeedback(items: FeedbackSubmission[]): void {
  try {
    // Không ghi vào localStorage trong chế độ xem trước
    if (!isTrustedPreviewEnvironment()) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
    }
    window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: items }));
    if (feedbackChannel) {
      try {
        feedbackChannel.postMessage({ type: 'update_feedback', payload: items });
      } catch {}
    }
  } catch (err) {
    console.error('Lỗi khi lưu ý kiến đóng góp', err);
  }
}

/**
 * Đồng bộ danh sách ý kiến đóng góp từ Cloud Firestore (khi Quản trị viên đã đăng nhập)
 */
export async function syncFeedbackWithFirestore(notifyNew = false): Promise<FeedbackSubmission[]> {
  if (isTrustedPreviewEnvironment()) {
    return [...MOCK_PREVIEW_FEEDBACK];
  }

  if (!isOnlineAuthenticated()) {
    return getStoredFeedback();
  }

  try {
    const remoteList = await fetchFeedbackFromFirestore();
    const deletedIds = getDeletedFeedbackIds();
    const validRemoteList = remoteList.filter((f) => !deletedIds.has(f.id));

    const local = getStoredFeedback();
    const localMap = new Map<string, FeedbackSubmission>();
    local.forEach((f) => {
      if (!deletedIds.has(f.id)) localMap.set(f.id, f);
    });

    const localIds = new Set(localMap.keys());
    const newItems = validRemoteList.filter((f) => !localIds.has(f.id));

    validRemoteList.forEach((f) => localMap.set(f.id, f));
    const merged = Array.from(localMap.values());
    merged.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

    saveFeedback(merged);

    if (newItems.length > 0 && notifyNew) {
      playNotificationChime();
      window.dispatchEvent(
        new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: newItems[0] })
      );
    }

    return merged;
  } catch (err) {
    console.warn('Lỗi đồng bộ ý kiến đóng góp từ Cloud Firestore:', err);
    return getStoredFeedback();
  }
}

/**
 * Khởi tạo đồng bộ ý kiến đóng góp với Cloud Firestore
 */
export function initFeedbackSync(): void {
  if (typeof window === 'undefined') return;

  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối không khởi tạo sync hoặc polling với Firestore trong preview
  if (isTrustedPreviewEnvironment()) return;

  // 1. Đồng bộ ban đầu nếu quản trị viên đã đăng nhập
  if (isOnlineAuthenticated()) {
    syncFeedbackWithFirestore(false);
  }

  // 2. Định kỳ polling kiểm tra góp ý mới mỗi 20 giây khi có phiên đăng nhập
  const pollInterval = setInterval(() => {
    if (isOnlineAuthenticated()) {
      syncFeedbackWithFirestore(true);
    }
  }, 20000);

  // Fallback SSE trong môi trường dev Express server
  if (import.meta.env.DEV) {
    try {
      const es = new EventSource('/api/admissions/stream');
      es.addEventListener('new_feedback', (e: MessageEvent) => {
        try {
          const newFb = JSON.parse(e.data);
          if (newFb && newFb.id) {
            const deletedIds = getDeletedFeedbackIds();
            if (deletedIds.has(newFb.id)) return;
            const current = getStoredFeedback();
            if (!current.some((f) => f.id === newFb.id)) {
              const updated = [newFb, ...current];
              saveFeedback(updated);
              playNotificationChime();
              window.dispatchEvent(
                new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: newFb })
              );
            }
          }
        } catch {}
      });
      es.onerror = () => {
        es.close();
      };
    } catch {}
  }
}

/**
 * Thêm ý kiến đóng góp / phản ánh (Async - Lưu trực tiếp vào Cloud Firestore)
 */
export async function addFeedbackSubmissionAsync(data: {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}): Promise<FeedbackSubmission> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  let createdFeedback: FeedbackSubmission;

  if (isTrustedPreviewEnvironment()) {
    // Chế độ xem trước AI Studio: chỉ tạo dữ liệu mẫu trong bộ nhớ, không gửi lên Firestore
    createdFeedback = {
      id: `preview-fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : '',
      message: data.message.trim(),
      submittedAt: dateStr,
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } else if (isFirebaseConfigured()) {
    createdFeedback = await createFeedbackInFirestore(data);
  } else {
    if (import.meta.env.PROD) {
      throw new Error('Chưa cấu hình Firebase; ý kiến chưa được gửi. Vui lòng liên hệ nhà trường.');
    }
    createdFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : '',
      message: data.message.trim(),
      submittedAt: dateStr,
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const current = getStoredFeedback();
  const updated = [createdFeedback, ...current.filter((f) => f.id !== createdFeedback.id)];
  saveFeedback(updated);

  if (feedbackChannel) {
    try {
      feedbackChannel.postMessage({ type: 'new_feedback', payload: createdFeedback });
    } catch {}
  }

  try {
    playNotificationChime();
    window.dispatchEvent(
      new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: createdFeedback })
    );
  } catch {}

  return createdFeedback;
}

/**
 * Giữ wrapper đồng bộ để tương thích ngược
 */
export function addFeedbackSubmission(data: {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}): FeedbackSubmission {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  const localFb: FeedbackSubmission = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    email: data.email ? data.email.trim() : '',
    message: data.message.trim(),
    submittedAt: dateStr,
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const current = getStoredFeedback();
  const updated = [localFb, ...current];
  saveFeedback(updated);

  if (!isTrustedPreviewEnvironment() && isFirebaseConfigured()) {
    createFeedbackInFirestore(data)
      .then((remote) => {
        const latest = getStoredFeedback();
        const replaced = latest.map((f) => (f.id === localFb.id ? remote : f));
        saveFeedback(replaced);
      })
      .catch((err) => {
        console.warn('Lỗi ghi góp ý lên Cloud Firestore ngầm:', err);
      });
  }

  return localFb;
}

export function updateFeedbackStatus(id: string, status: 'pending' | 'read' | 'resolved'): void {
  const current = getStoredFeedback();
  const updated = current.map((f) => (f.id === id ? { ...f, status, updatedAt: new Date().toISOString() } : f));
  saveFeedback(updated);

  if (!isTrustedPreviewEnvironment() && isOnlineAuthenticated()) {
    updateFeedbackStatusInFirestore(id, status).catch((err) => {
      console.warn('Lỗi cập nhật trạng thái góp ý Firestore:', err);
    });
  }
}

export function deleteFeedback(id: string): void {
  recordDeletedFeedbackId(id);
  const current = getStoredFeedback();
  const updated = current.filter((f) => f.id !== id);
  saveFeedback(updated);

  if (!isTrustedPreviewEnvironment() && isOnlineAuthenticated()) {
    deleteFeedbackFromFirestore(id).catch((err) => {
      console.warn('Lỗi xóa góp ý Firestore:', err);
    });
  }
}

export function clearAllFeedback(): void {
  try {
    localStorage.removeItem(DELETED_FEEDBACK_IDS_KEY);
  } catch {}
  saveFeedback([]);
}

/**
 * Xuất danh sách ý kiến đóng góp thành file Excel (.xlsx) chuẩn mẫu
 */
export function exportFeedbackToExcel(
  items: FeedbackSubmission[],
  filename?: string
): void {
  const titleHeader = [
    ['TRƯỜNG TIỂU HỌC LÊ LỢI - XÃ PƠNG DRANG, TỈNH ĐẮK LẮK'],
    ['HỘP THƯ TIẾP NHẬN Ý KIẾN ĐÓNG GÓP & PHẢN ÁNH TỪ PHỤ HUYNH / NHÂN DÂN'],
    [`Ngày xuất danh sách: ${new Date().toLocaleDateString('vi-VN')} - Tổng số: ${items.length} ý kiến`],
    [],
  ];

  const headers = [
    'STT',
    'Thời Gian Gửi',
    'Họ Và Tên Người Gửi',
    'Số Điện Thoại Liên Hệ',
    'Email',
    'Nội Dung Ý Kiến Đóng Góp / Trao Đổi',
    'Trạng Thái Xử Lý',
  ];

  const dataRows = items.map((f, index) => [
    index + 1,
    f.submittedAt,
    f.fullName,
    f.phone,
    f.email || '(Không có)',
    f.message,
    f.status === 'resolved' ? 'Đã tiếp thu & phản hồi' : f.status === 'read' ? 'Đã đọc' : 'Chờ phản hồi (Mới)',
  ]);

  const wsData = [...titleHeader, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 20 }, // Thời gian
    { wch: 25 }, // Họ tên
    { wch: 18 }, // SĐT
    { wch: 25 }, // Email
    { wch: 65 }, // Nội dung
    { wch: 25 }, // Trạng thái
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'YKienDongGop');

  const nowStr = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `Y_Kien_Dong_Gop_TH_Le_Loi_${nowStr}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Xuất danh sách ý kiến đóng góp thành file CSV
 */
export function exportFeedbackToCsv(items: FeedbackSubmission[]): void {
  const headers = ['STT', 'Thời Gian', 'Họ Và Tên', 'Số Điện Thoại', 'Email', 'Nội Dung', 'Trạng Thái'];
  const rows = items.map((f, i) => [
    i + 1,
    `"${f.submittedAt}"`,
    `"${f.fullName.replace(/"/g, '""')}"`,
    `"${f.phone}"`,
    `"${(f.email || '').replace(/"/g, '""')}"`,
    `"${f.message.replace(/"/g, '""')}"`,
    `"${f.status === 'resolved' ? 'Đã phản hồi' : f.status === 'read' ? 'Đã đọc' : 'Chờ phản hồi'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Y_Kien_Dong_Gop_TH_Le_Loi_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
