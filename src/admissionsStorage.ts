import * as XLSX from 'xlsx';
import { AdmissionRegistration } from './types';

const STORAGE_KEY = 'th_leloi_admissions_registrations_v2';
export const ADMISSIONS_UPDATE_EVENT = 'th_leloi_admissions_updated';
export const NEW_ADMISSION_NOTIFICATION_EVENT = 'th_leloi_new_admission_notification';

/**
 * Âm thanh chuông báo tinh tế khi có phụ huynh đăng ký mới (sử dụng Web Audio API chuẩn)
 */
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: E5 (~659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: G#5 (~830Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Không làm gián đoạn trải nghiệm nếu trình duyệt chặn autoplay
  }
}

export const SAMPLE_ADMISSIONS_REGISTRATIONS: AdmissionRegistration[] = [
  {
    id: 'reg-sample-1',
    parentName: 'Y-Kha Mlô',
    phone: '0945823114',
    childName: 'H’Nhiên Mlô',
    birthYear: '2020',
    campusChoice: 'Trường chính (Thôn Ea Tút)',
    note: 'Xin tư vấn về thời gian tiếp nhận hồ sơ gốc và thủ tục hỗ trợ chi phí học tập cho con em đồng bào.',
    submittedAt: '2026-10-10 08:30:00',
    status: 'pending',
  },
  {
    id: 'reg-sample-2',
    parentName: 'Nguyễn Thị Thu Hà',
    phone: '0912445892',
    childName: 'Nguyễn Minh Khang',
    birthYear: '2020',
    campusChoice: 'Phân hiệu 1',
    note: 'Gia đình ở gần Phân hiệu 1, muốn hỏi về việc chuẩn bị sách vở và đồ dùng lớp 1 cho cháu.',
    submittedAt: '2026-10-11 14:15:00',
    status: 'contacted',
  },
  {
    id: 'reg-sample-3',
    parentName: 'Trần Văn Hùng',
    phone: '0988712345',
    childName: 'Trần Gia Hân',
    birthYear: '2020',
    campusChoice: 'Phân hiệu 2',
    note: 'Xin hỏi thời khóa biểu học 2 buổi/ngày và chương trình làm quen Tiếng Anh lớp 1.',
    submittedAt: '2026-10-12 07:20:00',
    status: 'pending',
  },
];

// Multi-tab BroadcastChannel for instant real-time sync across all open browser tabs
const ADMISSIONS_BC_NAME = 'th_leloi_admissions_channel';
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(ADMISSIONS_BC_NAME);
    channel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === 'new_admission' && msg.payload) {
        const current = getStoredRegistrations();
        if (!current.some((r) => r.id === msg.payload.id)) {
          const updated = [msg.payload, ...current];
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: updated }));
          playNotificationChime();
          window.dispatchEvent(
            new CustomEvent(NEW_ADMISSION_NOTIFICATION_EVENT, { detail: msg.payload })
          );
        }
      } else if (msg?.type === 'update_admissions' && Array.isArray(msg.payload)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(msg.payload));
        } catch {}
        window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: msg.payload }));
      }
    };
  }
} catch {}

// Cross-tab storage event listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: parsed }));
        }
      } catch {}
    }
  });
}

const DELETED_IDS_KEY = 'th_leloi_deleted_admission_ids';

function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function recordDeletedId(id: string) {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Khởi tạo đồng bộ tuyển sinh với server và lắng nghe Server-Sent Events (SSE)
 */
export function initAdmissionsSync(): void {
  if (typeof window === 'undefined') return;

  // 1. Đồng bộ danh sách ban đầu từ server
  const processServerList = (serverList: any[], isInitial: boolean) => {
    if (!Array.isArray(serverList)) return;
    const deletedIds = getDeletedIds();
    const validServerList = serverList.filter((r) => !deletedIds.has(r.id));

    const local = getStoredRegistrations();
    const localMap = new Map<string, AdmissionRegistration>();
    local.forEach((r) => {
      if (!deletedIds.has(r.id)) localMap.set(r.id, r);
    });

    const localIds = new Set(localMap.keys());
    const newItems = validServerList.filter((r) => !localIds.has(r.id));

    validServerList.forEach((r) => localMap.set(r.id, r));
    const merged = Array.from(localMap.values());

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}

    window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: merged }));

    // Nếu có đăng ký mới tinh từ phụ huynh gửi về trong lúc đang mở trang
    if (newItems.length > 0 && !isInitial) {
      playNotificationChime();
      window.dispatchEvent(
        new CustomEvent(NEW_ADMISSION_NOTIFICATION_EVENT, { detail: newItems[0] })
      );
    }
  };

  fetch('/api/admissions')
    .then((res) => (res.ok ? res.json() : null))
    .then((serverList) => {
      if (serverList) processServerList(serverList, true);
    })
    .catch(() => {});

  // 2. Định kỳ polling mỗi 15 giây để đảm bảo không bỏ sót đăng ký nào từ phụ huynh
  const pollInterval = setInterval(() => {
    fetch('/api/admissions')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverList) => {
        if (serverList) processServerList(serverList, false);
      })
      .catch(() => {});
  }, 15000);

  // 3. Kết nối Server-Sent Events để nhận thông báo real-time tức thì
  let es: EventSource | null = null;
  const connectSSE = () => {
    try {
      es = new EventSource('/api/admissions/stream');
      es.addEventListener('new_admission', (e: MessageEvent) => {
        try {
          const newReg = JSON.parse(e.data);
          if (newReg && newReg.id) {
            const deletedIds = getDeletedIds();
            if (deletedIds.has(newReg.id)) return;

            const current = getStoredRegistrations();
            if (!current.some((r) => r.id === newReg.id)) {
              const updated = [newReg, ...current];
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: updated }));
              playNotificationChime();
              window.dispatchEvent(
                new CustomEvent(NEW_ADMISSION_NOTIFICATION_EVENT, { detail: newReg })
              );
            }
          }
        } catch {}
      });

      es.addEventListener('delete_admission', (e: MessageEvent) => {
        try {
          const { id } = JSON.parse(e.data);
          if (id) {
            recordDeletedId(id);
            const current = getStoredRegistrations().filter((r) => r.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
            window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: current }));
          }
        } catch {}
      });

      es.addEventListener('clear_admissions', () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: [] }));
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

export function getStoredRegistrations(): AdmissionRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi đọc danh sách đăng ký tuyển sinh từ localStorage', err);
  }
  // Initialize with realistic samples only on initial empty visit
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ADMISSIONS_REGISTRATIONS));
  } catch {}
  return SAMPLE_ADMISSIONS_REGISTRATIONS;
}

export function saveRegistrations(regs: AdmissionRegistration[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regs));
    window.dispatchEvent(new CustomEvent(ADMISSIONS_UPDATE_EVENT, { detail: regs }));
    if (channel) {
      try {
        channel.postMessage({ type: 'update_admissions', payload: regs });
      } catch {}
    }
  } catch (err) {
    console.error('Lỗi khi lưu danh sách đăng ký tuyển sinh', err);
  }
}

export function addAdmissionRegistration(data: {
  parentName: string;
  phone: string;
  childName: string;
  birthYear: string;
  campusChoice: string;
  note: string;
}): AdmissionRegistration {
  const current = getStoredRegistrations();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  const newReg: AdmissionRegistration = {
    id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    parentName: data.parentName.trim(),
    phone: data.phone.trim(),
    childName: data.childName.trim(),
    birthYear: data.birthYear.trim() || '2020',
    campusChoice: data.campusChoice || 'Trường chính (Thôn Ea Tút)',
    note: data.note.trim() || 'Không có ghi chú',
    submittedAt: dateStr,
    status: 'pending',
  };

  const updated = [newReg, ...current];
  saveRegistrations(updated);

  // Broadcast to other tabs
  if (channel) {
    try {
      channel.postMessage({ type: 'new_admission', payload: newReg });
    } catch {}
  }

  // Push to server for persistent storage and cross-device sync
  try {
    fetch('/api/admissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch {}

  // Phát chuông báo và bắn thông báo hiển thị tới nhà trường / quản trị
  try {
    playNotificationChime();
    window.dispatchEvent(
      new CustomEvent(NEW_ADMISSION_NOTIFICATION_EVENT, { detail: newReg })
    );
  } catch {}

  return newReg;
}

export function updateRegistrationStatus(id: string, status: 'pending' | 'contacted'): void {
  const current = getStoredRegistrations();
  const updated = current.map((r) => (r.id === id ? { ...r, status } : r));
  saveRegistrations(updated);

  try {
    fetch(`/api/admissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  } catch {}
}

export function deleteRegistration(id: string): void {
  recordDeletedId(id);
  const current = getStoredRegistrations();
  const updated = current.filter((r) => r.id !== id);
  saveRegistrations(updated);

  try {
    fetch(`/api/admissions/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {}
}

export function clearAllRegistrations(): void {
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
  } catch {}
  saveRegistrations([]);
  try {
    fetch('/api/admissions', {
      method: 'DELETE',
    }).catch(() => {});
  } catch {}
}

/**
 * Thử nghiệm bắn thông báo phụ huynh đăng ký mới (Dành cho kiểm tra & demo)
 */
export function triggerTestAdmissionNotification(): AdmissionRegistration {
  const testReg = addAdmissionRegistration({
    parentName: 'H’Linh Niê',
    phone: '0935123789',
    childName: 'Y-Minh Niê',
    birthYear: '2020',
    campusChoice: 'Trường chính (Thôn Ea Tút)',
    note: 'Phụ huynh xin đăng ký tư vấn xét tuyển vào lớp 1 năm học mới.',
  });
  return testReg;
}

/**
 * Xuất danh sách đăng ký tư vấn tuyển sinh thành file Excel (.xlsx) chuẩn mẫu
 */
export function exportRegistrationsToExcel(
  registrations: AdmissionRegistration[],
  filename?: string
): void {
  const titleHeader = [
    ['TRƯỜNG TIỂU HỌC LÊ LỢI - XÃ PƠNG DRANG, TỈNH ĐẮK LẮK'],
    ['DANH SÁCH TỔNG HỢP PHỤ HUYNH ĐĂNG KÝ TƯ VẤN TUYỂN SINH TRỰC TUYẾN'],
    [`Ngày xuất danh sách: ${new Date().toLocaleDateString('vi-VN')} - Tổng số: ${registrations.length} phụ huynh`],
    [], // empty row
  ];

  const headers = [
    'STT',
    'Thời Gian Đăng Ký',
    'Họ Tên Phụ Huynh / Giám Hộ',
    'Số Điện Thoại Liên Hệ',
    'Họ Tên Học Sinh',
    'Năm Sinh',
    'Nguyện Vọng Điểm Trường',
    'Ghi Chú / Câu Hỏi Phụ Huynh',
    'Trạng Thái Xử Lý',
  ];

  const dataRows = registrations.map((r, index) => [
    index + 1,
    r.submittedAt,
    r.parentName,
    r.phone,
    r.childName,
    r.birthYear,
    r.campusChoice,
    r.note || '',
    r.status === 'contacted' ? 'Đã liên hệ tư vấn' : 'Chưa liên hệ (Mới)',
  ]);

  const wsData = [...titleHeader, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Thời gian
    { wch: 26 }, // Họ tên PH
    { wch: 18 }, // SĐT
    { wch: 24 }, // Họ tên HS
    { wch: 10 }, // Năm sinh
    { wch: 28 }, // Điểm trường
    { wch: 45 }, // Ghi chú
    { wch: 22 }, // Trạng thái
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DangKyTuyenSinh');

  const nowStr = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `Danh_Sach_Dang_Ky_Tuyen_Sinh_TH_Le_Loi_${nowStr}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Xuất danh sách dạng CSV dự phòng
 */
export function exportRegistrationsToCsv(registrations: AdmissionRegistration[]): void {
  const headers = 'STT,Thời gian,Họ tên phụ huynh,Số điện thoại,Họ tên học sinh,Năm sinh,Nguyện vọng điểm trường,Ghi chú,Trạng thái\n';
  const rows = registrations
    .map(
      (r, i) =>
        `"${i + 1}","${r.submittedAt}","${r.parentName}","${r.phone}","${r.childName}","${r.birthYear}","${r.campusChoice}","${r.note.replace(/"/g, '""')}","${
          r.status === 'contacted' ? 'Đã liên hệ tư vấn' : 'Chưa liên hệ'
        }"`
    )
    .join('\n');

  const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Danh_Sach_Dang_Ky_Tuyen_Sinh_TH_Le_Loi_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
