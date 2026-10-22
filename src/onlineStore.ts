import type { SiteContent, AdmissionRegistration, FeedbackSubmission, UserRole } from './types';
import {
  isTrustedPreviewEnvironment,
  MOCK_PREVIEW_ADMISSIONS,
  MOCK_PREVIEW_FEEDBACK,
} from './authEnvironment';

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  adminEmail: string;
}

export interface UserSession {
  idToken: string;
  uid: string;
  email: string;
  role: UserRole;
}

export interface PaginatedResult<T> {
  items: T[];
  nextPageToken?: string;
  totalFetched: number;
}

export interface FetchListOptions {
  pageSize?: number;
  pageToken?: string;
  fetchAll?: boolean;
}

/**
 * Đọc cấu hình Firebase với nguyên tắc bảo vệ website Production:
 * - Biến môi trường VITE_FIREBASE_* luôn là nguồn chân lý tối cao (authoritative source).
 * - localStorage CHỈ được dùng làm giá trị dự phòng trong môi trường dev cục bộ khi biến môi trường chưa được thiết lập.
 * - Tuyệt đối không để localStorage ghi đè Project ID của website production.
 */
export function getFirebaseConfig(): FirebaseConfig {
  const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string) || '';
  const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '';
  const envAdminEmail = (import.meta.env.VITE_FIREBASE_ADMIN_EMAIL as string) || '';
  // Production never accepts a Firebase project or API key from browser storage.
  // Preview also does not connect to real Firebase; configuration is display-only.
  const allowLocalFallback = import.meta.env.DEV && !isTrustedPreviewEnvironment();
  const readLocal = (key: string) =>
    allowLocalFallback && typeof window !== 'undefined' ? localStorage.getItem(key) || '' : '';
  return {
    apiKey: (envApiKey || readLocal('th_leloi_fb_apiKey')).trim(),
    projectId: (envProjectId || readLocal('th_leloi_fb_projectId')).trim(),
    adminEmail: (envAdminEmail || readLocal('th_leloi_fb_adminEmail')).trim(),
  };
}

export function saveFirebaseConfig(config: Partial<FirebaseConfig>): void {
  // The deployed site uses its build-time configuration exclusively.
  if (import.meta.env.PROD || isTrustedPreviewEnvironment() || typeof window === 'undefined') {
    throw new Error('Không được thay đổi cấu hình Firebase tại trình duyệt của website hoặc môi trường xem trước.');
  }
  if (config.apiKey !== undefined) localStorage.setItem('th_leloi_fb_apiKey', config.apiKey.trim());
  if (config.projectId !== undefined) localStorage.setItem('th_leloi_fb_projectId', config.projectId.trim());
  if (config.adminEmail !== undefined) localStorage.setItem('th_leloi_fb_adminEmail', config.adminEmail.trim());
}

export function isFirebaseConfigured(): boolean {
  if (isTrustedPreviewEnvironment()) return false;
  const conf = getFirebaseConfig();
  return Boolean(conf.apiKey && conf.projectId);
}

// Xuất biến tương thích ngược
export const onlineEnabled = Boolean(
  !isTrustedPreviewEnvironment() &&
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let session: UserSession | null = null;

const authEndpoint = (key: string) =>
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`;

const documentEndpoint = (projectId: string, name: string) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/siteData/${name}`;

const collectionEndpoint = (projectId: string, colName: string) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(colName)}`;

const documentByIdEndpoint = (projectId: string, colName: string, docId: string) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(colName)}/${encodeURIComponent(docId)}`;

async function checked(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMsg = data?.error?.message || `HTTP ${res.status}`;
    if (rawMsg.includes('EMAIL_NOT_FOUND')) {
      throw new Error('Email chưa được tạo trong Firebase Authentication. Vui lòng kiểm tra lại địa chỉ email.');
    }
    if (rawMsg.includes('INVALID_PASSWORD') || rawMsg.includes('INVALID_LOGIN_CREDENTIALS')) {
      throw new Error('Mật khẩu Firebase Authentication không chính xác.');
    }
    if (rawMsg.includes('USER_DISABLED')) {
      throw new Error('Tài khoản quản trị Firebase này đã bị vô hiệu hóa.');
    }
    if (rawMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      throw new Error('Đã thử sai quá nhiều lần. Firebase tạm khóa để bảo vệ, vui lòng thử lại sau vài phút.');
    }
    if (rawMsg.includes('OPERATION_NOT_ALLOWED')) {
      throw new Error('Chưa bật tính năng Email/Password trong Firebase Console → Authentication → Sign-in method.');
    }
    if (rawMsg.includes('API_KEY_INVALID')) {
      throw new Error('Firebase Web API Key không hợp lệ hoặc đã hết hạn.');
    }
    if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('Missing or insufficient permissions')) {
      throw new Error('Không đủ quyền truy cập dữ liệu (PERMISSION_DENIED). Vui lòng kiểm tra vai trò phân quyền hoặc Security Rules trên Firebase.');
    }
    throw new Error(rawMsg);
  }
  return data;
}

/**
 * Trích xuất vai trò từ Firebase Authentication Custom Claims (token payload).
 * Hỗ trợ các vai trò chuẩn: 'super_admin' | 'admin' | 'editor' | 'viewer'
 * hoặc claim boolean 'admin: true' (quy ước thành 'admin').
 * TUYỆT ĐỐI KHÔNG tự gán quyền dựa trên chuỗi email hay mã frontend.
 */
function parseJwtRole(token: string): UserRole | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);

    if (payload.role && ['super_admin', 'admin', 'editor', 'viewer'].includes(payload.role)) {
      return payload.role as UserRole;
    }
    if (payload.admin === true) {
      return 'admin';
    }
  } catch {
    // Bỏ qua lỗi giải mã
  }
  return null;
}

/**
 * Kiểm tra phân quyền trong collection /userRoles/{uid} trên Firestore
 * khi tài khoản chưa được thiết lập Custom Claims trực tiếp trên token.
 */
async function fetchUserRoleFromFirestore(
  projectId: string,
  uid: string,
  idToken: string
): Promise<UserRole | null> {
  try {
    const url = documentByIdEndpoint(projectId, 'userRoles', uid);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const role = data?.fields?.role?.stringValue;
    if (role && ['super_admin', 'admin', 'editor', 'viewer'].includes(role)) {
      return role as UserRole;
    }
  } catch {
    // Không làm gián đoạn nếu collection chưa tạo
  }
  return null;
}

/**
 * Đăng nhập quản trị viên qua Firebase Authentication:
 * - Yêu cầu xác thực mật khẩu qua Google Identity Toolkit.
 * - Kiểm tra vai trò bảo mật (Custom Claims hoặc Firestore userRoles).
 * - Nếu tài khoản không có vai trò hợp lệ, TỪ CHỐI truy cập quản trị ngay lập tức.
 */
export async function loginOnline(email: string, password: string): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước chỉ dùng dữ liệu mẫu; không đăng nhập Firebase Production.');
  }
  const conf = getFirebaseConfig();
  if (!conf.apiKey || !conf.projectId) {
    throw new Error('Chưa cấu hình Firebase Web API Key hoặc Project ID. Vui lòng kiểm tra biến môi trường.');
  }

  const auth = await checked(
    await fetch(authEndpoint(conf.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    })
  );

  // 1. Kiểm tra vai trò từ Firebase Custom Claims
  let role = parseJwtRole(auth.idToken);

  // 2. Nếu token chưa có Custom Claims, kiểm tra cơ sở dữ liệu phân quyền /userRoles/{uid}
  if (!role) {
    role = await fetchUserRoleFromFirestore(conf.projectId, auth.localId, auth.idToken);
  }

  // 3. NGUYÊN TẮC BẢO MẬT: Từ chối truy cập nếu tài khoản không có bất kỳ vai trò hợp lệ nào
  if (!role) {
    throw new Error(
      'Tài khoản đăng nhập thành công nhưng CHƯA ĐƯỢC CẤP VAI TRÒ QUẢN TRỊ. ' +
      'Vui lòng gán Firebase Custom Claim (role: "admin" hoặc "super_admin") hoặc thêm tài khoản vào collection "userRoles" trên Firebase Console để được cấp quyền.'
    );
  }

  session = {
    idToken: auth.idToken,
    uid: auth.localId,
    email: auth.email,
    role,
  };
}

export function logoutOnline(): void {
  session = null;
}

export function isOnlineAuthenticated(): boolean {
  return Boolean(session);
}

export function getOnlineSession(): UserSession | null {
  return session;
}

export function getAdminRole(): UserRole | null {
  return session?.role || null;
}

export function hasPermission(requiredRole: UserRole): boolean {
  if (!session) return false;
  const roleHierarchy: Record<UserRole, number> = {
    super_admin: 4,
    admin: 3,
    editor: 2,
    viewer: 1,
  };
  return (roleHierarchy[session.role] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/* ==========================================================================
   Firestore Serialization Helpers
   ========================================================================== */

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((item) =>
            typeof item === 'string' ? { stringValue: item } : { stringValue: JSON.stringify(item) }
          ),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { stringValue: JSON.stringify(val) };
    }
  }
  return fields;
}

function fromFirestoreDocument(doc: any): Record<string, any> {
  const fields = doc?.fields || {};
  const res: Record<string, any> = {};
  for (const [key, val] of Object.entries<any>(fields)) {
    if (val.stringValue !== undefined) {
      res[key] = val.stringValue;
    } else if (val.integerValue !== undefined) {
      res[key] = parseInt(val.integerValue, 10);
    } else if (val.doubleValue !== undefined) {
      res[key] = val.doubleValue;
    } else if (val.booleanValue !== undefined) {
      res[key] = val.booleanValue;
    } else if (val.timestampValue !== undefined) {
      res[key] = val.timestampValue;
    } else if (val.arrayValue?.values) {
      res[key] = val.arrayValue.values.map((v: any) => v.stringValue ?? JSON.stringify(v));
    }
  }
  if (doc?.name) {
    const parts = doc.name.split('/');
    res.id = parts[parts.length - 1];
  }
  return res;
}

/* ==========================================================================
   Site Content Operations (siteData)
   ========================================================================== */

async function readDocument(name: string, authenticated = false): Promise<any | null> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) return null;

  const response = await fetch(documentEndpoint(conf.projectId, name), {
    cache: 'no-store',
    headers: authenticated && session ? { Authorization: `Bearer ${session.idToken}` } : {},
  });
  if (response.status === 404) return null;
  const data = await checked(response);
  return JSON.parse(data.fields?.payload?.stringValue || '{}');
}

export async function loadOnlineContent(): Promise<Partial<SiteContent> | null> {
  if (!isFirebaseConfigured() || isTrustedPreviewEnvironment()) return null;
  return readDocument('publicContent');
}

export async function loadPrivateStudents(): Promise<SiteContent['students'] | null> {
  if (isTrustedPreviewEnvironment()) return null;
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách học sinh.');
  }
  const data = await readDocument('privateStudents', true);
  return data?.students || null;
}

async function writeDocument(name: string, payload: object) {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không được ghi dữ liệu lên Cloud Firestore Production.');
  }
  if (!session) throw new Error('Phiên quản trị không hợp lệ. Hãy đăng nhập lại.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Thiếu Project ID Firebase.');

  await checked(
    await fetch(documentEndpoint(conf.projectId, name) + '?updateMask.fieldPaths=payload', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(payload) } } }),
    })
  );
}

export async function saveOnlineContent(content: SiteContent): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không được ghi dữ liệu lên Cloud Firestore Production.');
  }
  if (!isFirebaseConfigured() || !session) {
    throw new Error('Chưa đăng nhập Firebase; dữ liệu chưa được đăng trực tuyến.');
  }
  if (!hasPermission('editor')) {
    throw new Error('Từ chối truy cập: Bạn không có quyền chỉnh sửa nội dung website.');
  }
  const { students: _privateStudents, ...publicContent } = content;
  await writeDocument('publicContent', publicContent);
}

export async function savePrivateStudents(students: SiteContent['students']): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không được ghi dữ liệu học sinh lên Cloud Firestore Production.');
  }
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền lưu danh sách học sinh.');
  }
  if (!Array.isArray(students) || students.length === 0) {
    throw new Error('Không cho phép thay thế danh sách học sinh bằng danh sách rỗng.');
  }
  await writeDocument('privateStudents', { students });
}

/* ==========================================================================
   Anti-Spam & Deduplication Memory Store
   ========================================================================== */

const recentSubmissionHashes = new Map<string, number>();

function checkDuplicateSubmission(hashKey: string, cooldownMs = 60000): void {
  const now = Date.now();
  const lastTime = recentSubmissionHashes.get(hashKey);
  if (lastTime && now - lastTime < cooldownMs) {
    throw new Error('Thông tin tương tự vừa được gửi lên hệ thống. Vui lòng chờ ít phút trước khi gửi lại.');
  }
  recentSubmissionHashes.set(hashKey, now);

  // Dọn dẹp bộ nhớ tạm sau 10 phút
  if (recentSubmissionHashes.size > 200) {
    for (const [k, time] of recentSubmissionHashes.entries()) {
      if (now - time > 600000) recentSubmissionHashes.delete(k);
    }
  }
}

/* ==========================================================================
   Admissions Collection Operations (Cloud Firestore)
   ========================================================================== */

export async function createAdmissionInFirestore(data: {
  parentName: string;
  phone: string;
  childName: string;
  birthYear: string;
  campusChoice: string;
  note: string;
}): Promise<AdmissionRegistration> {
  // 1. Kiểm tra tính hợp lệ dữ liệu đầu vào (Data Validation)
  const parentName = data.parentName.trim();
  const phone = data.phone.trim();
  const childName = data.childName.trim();
  const birthYear = data.birthYear.trim() || '2020';
  const campusChoice = data.campusChoice || 'Trường chính (Thôn Ea Tút)';
  const note = data.note?.trim() || 'Không có ghi chú';

  if (parentName.length < 2 || parentName.length > 100) {
    throw new Error('Họ tên phụ huynh phải từ 2 đến 100 ký tự.');
  }
  if (phone.length < 9 || phone.length > 15 || !/^[0-9+() -]+$/.test(phone)) {
    throw new Error('Số điện thoại không hợp lệ (cần từ 9 đến 15 chữ số).');
  }
  if (childName.length < 2 || childName.length > 100) {
    throw new Error('Họ tên học sinh phải từ 2 đến 100 ký tự.');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;
  const nowIso = now.toISOString();

  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối không ghi vào Cloud Firestore Production
  if (isTrustedPreviewEnvironment()) {
    return {
      id: `preview-adm-${Date.now()}`,
      parentName,
      phone,
      childName,
      birthYear,
      campusChoice,
      note,
      submittedAt: dateStr,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId) {
    throw new Error('Chưa cấu hình Firebase Project ID');
  }

  // 2. Chống spam và ngăn tạo bản ghi trùng lặp liên tục
  const deduplicationKey = `adm_${phone.replace(/\D/g, '')}_${childName.toLowerCase().replace(/\s+/g, '')}`;
  checkDuplicateSubmission(deduplicationKey, 30000); // Khóa trùng lặp trong 30 giây

  const payload = {
    parentName,
    phone,
    childName,
    birthYear,
    campusChoice,
    note,
    submittedAt: dateStr,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const url = collectionEndpoint(conf.projectId, 'admissions');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });

  const responseData = await checked(res);
  const created = fromFirestoreDocument(responseData);

  return {
    id: created.id || `reg-${Date.now()}`,
    parentName: payload.parentName,
    phone: payload.phone,
    childName: payload.childName,
    birthYear: payload.birthYear,
    campusChoice: payload.campusChoice,
    note: payload.note,
    submittedAt: payload.submittedAt,
    status: payload.status as 'pending' | 'contacted',
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

/**
 * Đọc hồ sơ tuyển sinh có hỗ trợ phân trang (Pagination).
 * Chỉ người dùng có vai trò từ 'viewer' trở lên mới được phép đọc.
 */
export async function fetchAdmissionsPaginated(
  pageSize = 50,
  pageToken?: string
): Promise<PaginatedResult<AdmissionRegistration>> {
  if (isTrustedPreviewEnvironment()) {
    return {
      items: [...MOCK_PREVIEW_ADMISSIONS],
      totalFetched: MOCK_PREVIEW_ADMISSIONS.length,
    };
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Từ chối truy cập: Cần đăng nhập tài khoản có thẩm quyền để xem hồ sơ tuyển sinh.');
  }
  if (!hasPermission('viewer')) {
    throw new Error('Từ chối truy cập: Tài khoản không có quyền đọc danh sách hồ sơ tuyển sinh.');
  }

  let url = `${collectionEndpoint(conf.projectId, 'admissions')}?pageSize=${Math.min(pageSize, 100)}`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${session.idToken}` },
  });

  if (res.status === 404) return { items: [], totalFetched: 0 };
  const data = await checked(res);
  const documents: any[] = data.documents || [];

  const items: AdmissionRegistration[] = documents.map((doc) => {
    const parsed = fromFirestoreDocument(doc);
    return {
      id: parsed.id,
      parentName: parsed.parentName || '',
      phone: parsed.phone || '',
      childName: parsed.childName || '',
      birthYear: parsed.birthYear || '2020',
      campusChoice: parsed.campusChoice || 'Trường chính (Thôn Ea Tút)',
      note: parsed.note || '',
      submittedAt: parsed.submittedAt || '',
      status: (parsed.status === 'contacted' ? 'contacted' : 'pending') as 'pending' | 'contacted',
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    };
  });

  items.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  return {
    items,
    nextPageToken: data.nextPageToken,
    totalFetched: items.length,
  };
}

/**
 * Tải toàn bộ danh sách hồ sơ tuyển sinh (Tự động duyệt qua các trang nếu > 100 bản ghi)
 */
export async function fetchAdmissionsFromFirestore(
  options?: FetchListOptions
): Promise<AdmissionRegistration[]> {
  if (isTrustedPreviewEnvironment()) {
    return [...MOCK_PREVIEW_ADMISSIONS];
  }

  const pageSize = options?.pageSize || 100;
  let pageToken = options?.pageToken;
  const fetchAll = options?.fetchAll !== false;

  const allItems: AdmissionRegistration[] = [];
  let pageCount = 0;
  const maxPages = 10; // Giới hạn an toàn tối đa 1000 bản ghi mỗi lượt đọc

  do {
    const result = await fetchAdmissionsPaginated(pageSize, pageToken);
    allItems.push(...result.items);
    pageToken = result.nextPageToken;
    pageCount++;
  } while (fetchAll && pageToken && pageCount < maxPages);

  allItems.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return allItems;
}

export async function updateAdmissionStatusInFirestore(
  id: string,
  status: 'pending' | 'contacted'
): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    return;
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Chưa đăng nhập quản trị trực tuyến.');
  }
  if (!hasPermission('editor')) {
    throw new Error('Từ chối truy cập: Bạn không có quyền cập nhật trạng thái hồ sơ tuyển sinh.');
  }

  const nowIso = new Date().toISOString();
  const url = `${documentByIdEndpoint(
    conf.projectId,
    'admissions',
    id
  )}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`;

  await checked(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: status },
          updatedAt: { stringValue: nowIso },
        },
      }),
    })
  );
}

export async function deleteAdmissionFromFirestore(id: string): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    return;
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Chưa đăng nhập quản trị trực tuyến.');
  }
  if (!hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa hồ sơ tuyển sinh.');
  }

  const url = documentByIdEndpoint(conf.projectId, 'admissions', id);
  await checked(
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.idToken}` },
    })
  );
}

/* ==========================================================================
   Feedback Collection Operations (Cloud Firestore)
   ========================================================================== */

export async function createFeedbackInFirestore(data: {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}): Promise<FeedbackSubmission> {
  // 1. Kiểm tra dữ liệu đầu vào
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  const email = data.email ? data.email.trim() : '';
  const message = data.message.trim();

  if (fullName.length < 2 || fullName.length > 100) {
    throw new Error('Họ và tên người gửi phải từ 2 đến 100 ký tự.');
  }
  if (phone.length < 9 || phone.length > 15 || !/^[0-9+() -]+$/.test(phone)) {
    throw new Error('Số điện thoại không hợp lệ (cần từ 9 đến 15 chữ số).');
  }
  if (message.length < 2 || message.length > 3000) {
    throw new Error('Nội dung ý kiến đóng góp phải từ 2 đến 3000 ký tự.');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;
  const nowIso = now.toISOString();

  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối không ghi ý kiến vào Cloud Firestore Production
  if (isTrustedPreviewEnvironment()) {
    return {
      id: `preview-fb-${Date.now()}`,
      fullName,
      phone,
      email,
      message,
      submittedAt: dateStr,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId) {
    throw new Error('Chưa cấu hình Firebase Project ID');
  }

  // 2. Chống spam và gửi lặp liên tục
  const deduplicationKey = `fb_${phone.replace(/\D/g, '')}_${message.slice(0, 30).toLowerCase().replace(/\s+/g, '')}`;
  checkDuplicateSubmission(deduplicationKey, 30000);

  const payload = {
    fullName,
    phone,
    email,
    message,
    submittedAt: dateStr,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const url = collectionEndpoint(conf.projectId, 'feedback');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });

  const responseData = await checked(res);
  const created = fromFirestoreDocument(responseData);

  return {
    id: created.id || `fb-${Date.now()}`,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    message: payload.message,
    submittedAt: payload.submittedAt,
    status: payload.status as 'pending' | 'read' | 'resolved',
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

/**
 * Đọc ý kiến đóng góp có phân trang.
 * Yêu cầu quyền từ 'viewer' trở lên.
 */
export async function fetchFeedbackPaginated(
  pageSize = 50,
  pageToken?: string
): Promise<PaginatedResult<FeedbackSubmission>> {
  if (isTrustedPreviewEnvironment()) {
    return {
      items: [...MOCK_PREVIEW_FEEDBACK],
      totalFetched: MOCK_PREVIEW_FEEDBACK.length,
    };
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Từ chối truy cập: Cần đăng nhập tài khoản có thẩm quyền để xem hộp thư ý kiến.');
  }
  if (!hasPermission('viewer')) {
    throw new Error('Từ chối truy cập: Tài khoản không có quyền đọc danh sách ý kiến đóng góp.');
  }

  let url = `${collectionEndpoint(conf.projectId, 'feedback')}?pageSize=${Math.min(pageSize, 100)}`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${session.idToken}` },
  });

  if (res.status === 404) return { items: [], totalFetched: 0 };
  const data = await checked(res);
  const documents: any[] = data.documents || [];

  const items: FeedbackSubmission[] = documents.map((doc) => {
    const parsed = fromFirestoreDocument(doc);
    return {
      id: parsed.id,
      fullName: parsed.fullName || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      message: parsed.message || '',
      submittedAt: parsed.submittedAt || '',
      status: (parsed.status === 'resolved'
        ? 'resolved'
        : parsed.status === 'read'
        ? 'read'
        : 'pending') as 'pending' | 'read' | 'resolved',
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    };
  });

  items.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  return {
    items,
    nextPageToken: data.nextPageToken,
    totalFetched: items.length,
  };
}

/**
 * Tải toàn bộ ý kiến đóng góp (Tự động duyệt qua các trang nếu > 100 bản ghi)
 */
export async function fetchFeedbackFromFirestore(
  options?: FetchListOptions
): Promise<FeedbackSubmission[]> {
  if (isTrustedPreviewEnvironment()) {
    return [...MOCK_PREVIEW_FEEDBACK];
  }

  const pageSize = options?.pageSize || 100;
  let pageToken = options?.pageToken;
  const fetchAll = options?.fetchAll !== false;

  const allItems: FeedbackSubmission[] = [];
  let pageCount = 0;
  const maxPages = 10;

  do {
    const result = await fetchFeedbackPaginated(pageSize, pageToken);
    allItems.push(...result.items);
    pageToken = result.nextPageToken;
    pageCount++;
  } while (fetchAll && pageToken && pageCount < maxPages);

  allItems.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return allItems;
}

export async function updateFeedbackStatusInFirestore(
  id: string,
  status: 'pending' | 'read' | 'resolved'
): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    return;
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Chưa đăng nhập quản trị trực tuyến.');
  }
  if (!hasPermission('editor')) {
    throw new Error('Từ chối truy cập: Bạn không có quyền cập nhật trạng thái ý kiến.');
  }

  const nowIso = new Date().toISOString();
  const url = `${documentByIdEndpoint(
    conf.projectId,
    'feedback',
    id
  )}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`;

  await checked(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: status },
          updatedAt: { stringValue: nowIso },
        },
      }),
    })
  );
}

export async function deleteFeedbackFromFirestore(id: string): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    return;
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId || !session) {
    throw new Error('Chưa đăng nhập quản trị trực tuyến.');
  }
  if (!hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa ý kiến đóng góp.');
  }

  const url = documentByIdEndpoint(conf.projectId, 'feedback', id);
  await checked(
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.idToken}` },
    })
  );
}
