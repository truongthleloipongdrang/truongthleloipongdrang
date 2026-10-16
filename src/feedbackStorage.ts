import * as XLSX from 'xlsx';
import { FeedbackSubmission } from './types';
import { playNotificationChime } from './admissionsStorage';

export const FEEDBACK_STORAGE_KEY = 'th_leloi_feedback_submissions';
export const DELETED_FEEDBACK_IDS_KEY = 'th_leloi_deleted_feedback_ids';
export const FEEDBACK_UPDATE_EVENT = 'th_leloi_feedback_update';
export const NEW_FEEDBACK_NOTIFICATION_EVENT = 'th_leloi_new_feedback_notification';

export const SAMPLE_FEEDBACK_SUBMISSIONS: FeedbackSubmission[] = [
  {
    id: 'fb-sample-1',
    fullName: 'Nguyễn Văn Tuấn',
    phone: '0983145678',
    email: 'tuan.nguyen@gmail.com',
    message:
      'Kính gửi Ban Giám hiệu, gia đình tôi có con học lớp 2A. Tôi rất cảm kích trước sự tận tâm của các thầy cô giáo và nhà trường. Tôi xin đóng góp ý kiến nhỏ về việc mở rộng thêm khu vực để xe có mái che cho phụ huynh đón con vào những ngày mưa.',
    submittedAt: '2026-10-12 15:30:00',
    status: 'pending',
  },
  {
    id: 'fb-sample-2',
    fullName: 'H’Nương Mlô',
    phone: '0918765432',
    email: '',
    message:
      'Phụ huynh xin đề xuất nhà trường duy trì và tổ chức thêm các buổi giao lưu văn nghệ cồng chiêng và trò chơi dân gian cho các em học sinh tại các phân hiệu.',
    submittedAt: '2026-10-13 09:15:00',
    status: 'resolved',
  },
];

// Multi-tab BroadcastChannel for real-time feedback sync
const FEEDBACK_BC_NAME = 'th_leloi_feedback_channel';
let feedbackChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
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
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
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

  const newFb: FeedbackSubmission = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    email: data.email ? data.email.trim() : '',
    message: data.message.trim(),
    submittedAt: dateStr,
    status: 'pending',
  };

  const current = getStoredFeedback();
  const updated = [newFb, ...current];
  saveFeedback(updated);

  if (feedbackChannel) {
    try {
      feedbackChannel.postMessage({ type: 'new_feedback', payload: newFb });
    } catch {}
  }

  // Push to server for persistent storage and cross-device sync
  try {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch {}

  // Phát chuông báo và bắn thông báo hiển thị
  try {
    playNotificationChime();
    window.dispatchEvent(
      new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: newFb })
    );
  } catch {}

  return newFb;
}

export function updateFeedbackStatus(id: string, status: 'pending' | 'resolved'): void {
  const current = getStoredFeedback();
  const updated = current.map((f) => (f.id === id ? { ...f, status } : f));
  saveFeedback(updated);

  try {
    fetch(`/api/feedback/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  } catch {}
}

export function deleteFeedback(id: string): void {
  recordDeletedFeedbackId(id);
  const current = getStoredFeedback();
  const updated = current.filter((f) => f.id !== id);
  saveFeedback(updated);

  try {
    fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {}
}

export function clearAllFeedback(): void {
  try {
    localStorage.removeItem(DELETED_FEEDBACK_IDS_KEY);
  } catch {}
  saveFeedback([]);
  try {
    fetch('/api/feedback', {
      method: 'DELETE',
    }).catch(() => {});
  } catch {}
}

/**
 * Khởi tạo đồng bộ ý kiến đóng góp với server và lắng nghe Server-Sent Events (SSE)
 */
export function initFeedbackSync(): void {
  if (typeof window === 'undefined') return;

  const processServerList = (serverList: any[], isInitial: boolean) => {
    if (!Array.isArray(serverList)) return;
    const deletedIds = getDeletedFeedbackIds();
    const validServerList = serverList.filter((f) => !deletedIds.has(f.id));

    const local = getStoredFeedback();
    const localMap = new Map<string, FeedbackSubmission>();
    local.forEach((f) => {
      if (!deletedIds.has(f.id)) localMap.set(f.id, f);
    });

    const localIds = new Set(localMap.keys());
    const newItems = validServerList.filter((f) => !localIds.has(f.id));

    validServerList.forEach((f) => localMap.set(f.id, f));
    const merged = Array.from(localMap.values());

    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(merged));
    } catch {}

    window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: merged }));

    if (newItems.length > 0 && !isInitial) {
      playNotificationChime();
      window.dispatchEvent(
        new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: newItems[0] })
      );
    }
  };

  fetch('/api/feedback')
    .then((res) => (res.ok ? res.json() : null))
    .then((serverList) => {
      if (serverList) processServerList(serverList, true);
    })
    .catch(() => {});

  // Periodic polling every 15s
  const pollInterval = setInterval(() => {
    fetch('/api/feedback')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverList) => {
        if (serverList) processServerList(serverList, false);
      })
      .catch(() => {});
  }, 15000);

  // SSE Stream
  let es: EventSource | null = null;
  const connectSSE = () => {
    try {
      es = new EventSource('/api/admissions/stream');
      es.addEventListener('new_feedback', (e: MessageEvent) => {
        try {
          const newFb = JSON.parse(e.data);
          if (newFb && newFb.id) {
            const deletedIds = getDeletedFeedbackIds();
            if (deletedIds.has(newFb.id)) return;

            const current = getStoredFeedback();
            if (!current.some((f) => f.id === newFb.id)) {
              const updated = [newFb, ...current];
              try {
                localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: updated }));
              playNotificationChime();
              window.dispatchEvent(
                new CustomEvent(NEW_FEEDBACK_NOTIFICATION_EVENT, { detail: newFb })
              );
            }
          }
        } catch {}
      });

      es.addEventListener('delete_feedback', (e: MessageEvent) => {
        try {
          const { id } = JSON.parse(e.data);
          if (id) {
            recordDeletedFeedbackId(id);
            const current = getStoredFeedback().filter((f) => f.id !== id);
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(current));
            window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: current }));
          }
        } catch {}
      });

      es.addEventListener('clear_feedback', () => {
        try {
          localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([]));
          window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATE_EVENT, { detail: [] }));
        } catch {}
      });

      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        setTimeout(connectSSE, 6000);
      };
    } catch {}
  };
  connectSSE();
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
    f.status === 'resolved' ? 'Đã tiếp thu & phản hồi' : 'Chờ phản hồi (Mới)',
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
    `"${f.status === 'resolved' ? 'Đã phản hồi' : 'Chờ phản hồi'}"`,
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
