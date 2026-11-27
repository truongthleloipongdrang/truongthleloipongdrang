import type {
  SiteContent,
  AdmissionRegistration,
  FeedbackSubmission,
  UserRole,
  StudentRecord,
  StudentResultRecord,
  ParentLinkRecord,
  DocumentSubmission,
  MemberUser,
} from './types';
import { deduplicateStudents } from './studentExcelHelper';
import { toSafeStudentResultDocId } from './urlValidation';
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
  refreshToken: string;
  expiresAt: number; // Thời điểm hết hạn (timestamp epoch ms)
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

  // Production và môi trường xem trước AI Studio không bao giờ đọc API Key / Project ID từ localStorage
  const allowLocalFallback = import.meta.env.DEV && !isTrustedPreviewEnvironment();
  const readLocal = (key: string) =>
    allowLocalFallback && typeof window !== 'undefined' ? localStorage.getItem(key) || '' : '';

  return {
    apiKey: (envApiKey || readLocal('th_leloi_fb_apiKey')).trim(),
    projectId: (envProjectId || readLocal('th_leloi_fb_projectId')).trim(),
    adminEmail: (envAdminEmail || readLocal('th_leloi_fb_adminEmail') || 'truongthleloipongdrang@gmail.com').trim(),
  };
}

/**
 * Lưu cấu hình dự phòng trong localStorage cho môi trường dev.
 * Chặn hoàn toàn việc ghi đè trên website production hoặc môi trường xem trước.
 */
export function saveFirebaseConfig(config: Partial<FirebaseConfig>): void {
  if (import.meta.env.PROD || isTrustedPreviewEnvironment() || typeof window === 'undefined') {
    throw new Error('Không được thay đổi cấu hình Firebase tại trình duyệt của website hoặc môi trường xem trước.');
  }
  const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '';
  if (envProjectId && config.projectId && config.projectId.trim() !== envProjectId.trim()) {
    console.warn('Bảo mật: Không được phép thay đổi Firebase Project ID đã cấu hình.');
    return;
  }

  if (config.apiKey !== undefined) localStorage.setItem('th_leloi_fb_apiKey', config.apiKey.trim());
  if (!envProjectId && config.projectId !== undefined) {
    localStorage.setItem('th_leloi_fb_projectId', config.projectId.trim());
  }
  if (config.adminEmail !== undefined) localStorage.setItem('th_leloi_fb_adminEmail', config.adminEmail.trim());
  updateOnlineEnabledState();
}

export function isFirebaseConfigured(): boolean {
  if (isTrustedPreviewEnvironment()) return false;
  const conf = getFirebaseConfig();
  return Boolean(conf.apiKey && conf.projectId);
}

// Xuất biến tương thích ngược có thể cập nhật
export let onlineEnabled = isFirebaseConfigured();

export function updateOnlineEnabledState(): void {
  onlineEnabled = isFirebaseConfigured();
}

let session: UserSession | null = null;
let refreshPromise: Promise<string> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const authEndpoint = (key: string) =>
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`;

const secureTokenEndpoint = (key: string) =>
  `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(key)}`;

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
    if (res.status === 401 || rawMsg.includes('UNAUTHENTICATED') || rawMsg.includes('auth-token-expired') || rawMsg.includes('invalid authentication credentials')) {
      throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }
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
function parseJwtPayload(token: string): Record<string, any> | null {
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
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function parseJwtRole(token: string): UserRole | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  if (payload.role && ['super_admin', 'admin', 'editor', 'viewer'].includes(payload.role)) {
    return payload.role as UserRole;
  }
  if (payload.admin === true) {
    return 'admin';
  }
  return null;
}

interface FirestoreRoleLookupResult {
  exists: boolean;
  enabled: boolean;
  role: UserRole | null;
}

/**
 * Kiểm tra phân quyền trong collection /userRoles/{uid} trên Firestore.
 * Khi bản ghi tồn tại, nó là nguồn sự thật ưu tiên (kể cả khi enabled === false hoặc bị hạ vai trò).
 */
async function fetchUserRoleFromFirestore(
  projectId: string,
  uid: string,
  idToken: string
): Promise<FirestoreRoleLookupResult> {
  try {
    const url = documentByIdEndpoint(projectId, 'userRoles', uid);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    if (res.status === 404) {
      return { exists: false, enabled: true, role: null };
    }
    if (!res.ok) {
      return { exists: false, enabled: true, role: null };
    }
    const data = await res.json();
    const enabled = data?.fields?.enabled?.booleanValue !== false;
    const roleStr = data?.fields?.role?.stringValue;
    const validRole: UserRole | null =
      roleStr && ['super_admin', 'admin', 'editor', 'viewer'].includes(roleStr)
        ? (roleStr as UserRole)
        : null;
    return {
      exists: true,
      enabled,
      role: enabled ? validRole : null,
    };
  } catch {
    return { exists: false, enabled: true, role: null };
  }
}

/**
 * Đăng nhập quản trị viên qua Firebase Authentication:
 * - Yêu cầu xác thực mật khẩu qua Google Identity Toolkit.
 * - Kiểm tra vai trò bảo mật (Custom Claims hoặc Firestore userRoles).
 * - Nếu tài khoản không có vai trò hợp lệ, TỪ CHỐI truy cập quản trị ngay lập tức.
 */
/**
 * Lên lịch tự động làm mới token trước khi hết hạn (chủ động làm mới ngầm):
 * - Firebase ID token có thời hạn mặc định là 3600 giây (1 giờ).
 * - Tự động kích hoạt làm mới trước mốc hết hạn 5 phút (300.000 ms).
 * - Nếu thời hạn ngắn hơn 10 phút, làm mới ở mốc 80% thời hạn.
 */
function scheduleTokenRefresh(expiresInMs: number): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  const refreshAdvance = 5 * 60 * 1000;
  let delay = expiresInMs - refreshAdvance;
  if (delay <= 0 || delay < expiresInMs * 0.5) {
    delay = Math.floor(expiresInMs * 0.8);
  }

  if (delay > 0) {
    refreshTimer = setTimeout(async () => {
      if (session?.refreshToken) {
        try {
          await forceRefreshIdToken();
        } catch {
          // Khi làm mới thất bại ngầm, forceRefreshIdToken / refreshIdToken đã tự động logoutOnline()
        }
      }
    }, delay);
  }
}

// Lắng nghe khi tab trình duyệt hoạt động trở lại sau khi sleep/background để làm mới token kịp thời
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session?.refreshToken) {
      const BUFFER_MS = 5 * 60 * 1000;
      if (!session.expiresAt || Date.now() >= session.expiresAt - BUFFER_MS) {
        forceRefreshIdToken().catch(() => {
          // Bỏ qua lỗi ngầm, logoutOnline đã được kích hoạt nếu refresh thất bại
        });
      }
    }
  });
}

/**
 * Thực hiện làm mới Firebase ID token bằng refreshToken qua Secure Token Service:
 * - Yêu cầu 1: Bổ sung tự động làm mới Firebase ID token bằng refresh token trước khi hết hạn.
 * - Yêu cầu 3: Nếu làm mới token thất bại, yêu cầu đăng nhập lại (xóa session và ném lỗi).
 * - Yêu cầu 4: Giữ nguyên kiểm tra vai trò super_admin từ Custom Claims hoặc userRoles/{uid}.
 * - Yêu cầu 5: Không tự cấp quyền quản trị bằng email hoặc localStorage.
 * - Yêu cầu 6: Không lưu token vào localStorage, URL hoặc log (Bảo mật tuyệt đối).
 */
async function refreshIdToken(): Promise<string> {
  if (!session || !session.refreshToken) {
    logoutOnline();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const conf = getFirebaseConfig();
  if (!conf.apiKey) {
    logoutOnline();
    throw new Error('Chưa cấu hình Firebase Web API Key. Vui lòng đăng nhập lại.');
  }

  try {
    const res = await fetch(secureTokenEndpoint(conf.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }).toString(),
    });

    const data = await res.json().catch(() => ({}));
    const newIdToken: string | undefined = data.id_token || data.access_token;

    if (!res.ok || !newIdToken) {
      // Yêu cầu 3: Nếu làm mới token thất bại, yêu cầu đăng nhập lại
      logoutOnline();
      throw new Error('Phiên làm việc đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.');
    }

    const newRefreshToken: string = data.refresh_token || session.refreshToken;
    const expiresInSec = parseInt(data.expires_in || '3600', 10);
    const newExpiresAt = Date.now() + expiresInSec * 1000;

    // Luôn ưu tiên /userRoles/{uid} làm nguồn sự thật khi làm mới token (tôn trọng enabled=false & hạ quyền tức thì)
    let updatedRole: UserRole | null = null;
    if (conf.projectId && session.uid) {
      const fsRole = await fetchUserRoleFromFirestore(conf.projectId, session.uid, newIdToken);
      if (fsRole.exists) {
        if (!fsRole.enabled || !fsRole.role) {
          logoutOnline();
          throw new Error('Quyền quản trị của tài khoản này đã bị vô hiệu hóa hoặc thu hồi.');
        }
        updatedRole = fsRole.role;
      }
    }
    if (!updatedRole) {
      updatedRole = parseJwtRole(newIdToken) || session.role;
    }

    session = {
      ...session,
      idToken: newIdToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
      role: updatedRole,
    };

    scheduleTokenRefresh(expiresInSec * 1000);
    return newIdToken;
  } catch (error: any) {
    logoutOnline();
    throw new Error(error.message || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  } finally {
    refreshPromise = null;
  }
}

/**
 * Buộc làm mới Firebase ID token ngay lập tức (dùng khi token bị 401 hoặc làm mới chủ động)
 */
export async function forceRefreshIdToken(): Promise<string> {
  if (!session || !session.refreshToken) {
    logoutOnline();
    throw new Error('Phiên đăng nhập quản trị không tồn tại hoặc đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (!refreshPromise) {
    refreshPromise = refreshIdToken();
  }
  return refreshPromise;
}

/**
 * Lấy Firebase ID token còn hiệu lực:
 * - Tự động làm mới bằng refresh token trước khi hết hạn (5 phút buffer an toàn).
 * - Sử dụng chung promise nếu có nhiều tác vụ gọi đồng thời (tránh spam request làm mới).
 * - Nếu không có phiên hoặc làm mới thất bại, xóa session và yêu cầu đăng nhập lại.
 */
export async function getValidIdToken(force = false): Promise<string> {
  if (!session) {
    throw new Error('Phiên đăng nhập quản trị không tồn tại hoặc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  // Nếu token còn hạn an toàn trên 5 phút và không bắt buộc làm mới, sử dụng trực tiếp
  const BUFFER_MS = 5 * 60 * 1000;
  const isExpiredOrNearingExpiry = !session.expiresAt || Date.now() >= session.expiresAt - BUFFER_MS;

  if (!force && !isExpiredOrNearingExpiry) {
    return session.idToken;
  }

  // Token sắp hết hạn hoặc đã hết hạn -> Làm mới
  if (!refreshPromise) {
    refreshPromise = refreshIdToken();
  }
  return refreshPromise;
}

/**
 * Đăng nhập quản trị viên qua Firebase Authentication:
 * - Yêu cầu xác thực mật khẩu qua Google Identity Toolkit.
 * - Kiểm tra vai trò bảo mật (Custom Claims hoặc Firestore userRoles).
 * - Nếu tài khoản không có vai trò hợp lệ, TỪ CHỐI truy cập quản trị ngay lập tức.
 */
export async function loginOnline(email: string, password: string): Promise<void> {
  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Môi trường xem trước Google AI Studio tuyệt đối không gọi xác thực tới Firebase Production
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước Google AI Studio được cách ly an toàn. Vui lòng sử dụng "Mật khẩu Xem trước" để thử nghiệm dữ liệu mẫu.');
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

  // 1. Luôn kiểm tra /userRoles/{uid} TRƯỚC TIÊN (nguồn sự thật ưu tiên, kể cả khi JWT còn Custom Claims cũ)
  const fsRole = await fetchUserRoleFromFirestore(conf.projectId, auth.localId, auth.idToken);
  if (fsRole.exists && !fsRole.enabled) {
    throw new Error(
      'Tài khoản này đã bị SUPER ADMIN tạm khóa hoặc thu hồi quyền quản trị (enabled = false).'
    );
  }

  let role: UserRole | null = null;
  if (fsRole.exists) {
    // Khi /userRoles/{uid} tồn tại, không cho Custom Claims cũ vượt qua vai trò đã bị hạ cấp
    role = fsRole.role;
  } else {
    // 2. Khi chưa có /userRoles/{uid}, kiểm tra Firebase Custom Claims hợp lệ
    role = parseJwtRole(auth.idToken);

    // 3. Tài khoản bootstrap quản trị chính thức (khớp chặt với firestore.rules, không phụ thuộc email do frontend tự khai)
    const jwtPayload = parseJwtPayload(auth.idToken);
    const isEmailVerified = jwtPayload?.email_verified === true;
    const currentEmail = (auth.email || '').trim().toLowerCase();
    if (!role && currentEmail === 'truongthleloipongdrang@gmail.com') {
      if (isEmailVerified) {
        role = 'super_admin';
      } else {
        throw new Error(
          'Email quản trị chưa được xác minh (email_verified = false) và tài khoản chưa có vai trò trong /userRoles/{uid} hoặc Custom Claims. ' +
          'Vui lòng xác minh email tài khoản hoặc tạo bản ghi /userRoles/{uid} với role: "admin" (hoặc "super_admin") trên Firebase Console.'
        );
      }
    }
  }

  // 4. NGUYÊN TẮC BẢO MẬT: Từ chối truy cập nếu tài khoản không có bất kỳ vai trò hợp lệ nào
  if (!role) {
    throw new Error(
      'Tài khoản đăng nhập thành công nhưng CHƯA ĐƯỢC CẤP VAI TRÒ QUẢN TRỊ. ' +
      'Vui lòng gán vai trò trong /userRoles/{uid}, Firebase Custom Claims, hoặc xác minh email quản trị chính thức của nhà trường.'
    );
  }

  const expiresInSec = parseInt(auth.expiresIn || '3600', 10);
  const expiresAt = Date.now() + expiresInSec * 1000;

  session = {
    idToken: auth.idToken,
    refreshToken: auth.refreshToken || '',
    expiresAt,
    uid: auth.localId,
    email: auth.email,
    role,
  };

  updateOnlineEnabledState();
  scheduleTokenRefresh(expiresInSec * 1000);
}

export function logoutOnline(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  refreshPromise = null;
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

/**
 * Thực hiện gọi Firestore REST API có xác thực bằng Firebase ID Token còn hiệu lực:
 * - Yêu cầu 2: Các thao tác đọc/ghi Firestore phải dùng token còn hiệu lực.
 * - Yêu cầu 3: Nếu làm mới token thất bại, yêu cầu đăng nhập lại.
 * - Tự động thử làm mới token 1 lần nếu nhận mã 401 UNAUTHENTICATED từ Firestore.
 */
async function authenticatedFirestoreFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối chặn toàn bộ request có xác thực tới Cloud Firestore Production
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước Google AI Studio bị chặn tuyệt đối không truy cập Cloud Firestore Production.');
  }

  const token = await getValidIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(url, { ...init, headers });

  // Nếu gặp lỗi 401 (token vừa hết hạn hoặc bị thu hồi giữa chừng), chủ động làm mới token và thử lại 1 lần
  if (response.status === 401 && session?.refreshToken) {
    try {
      const newToken = await forceRefreshIdToken();
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...init, headers });
    } catch {
      logoutOnline();
      throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (response.status === 401) {
      logoutOnline();
      throw new Error('Phiên làm việc không còn hiệu lực. Vui lòng đăng nhập lại.');
    }
  }

  return response;
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
  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Môi trường xem trước AI Studio không đọc siteData từ Cloud Firestore Production
  if (isTrustedPreviewEnvironment()) return null;

  const conf = getFirebaseConfig();
  if (!conf.projectId) return null;

  const url = documentEndpoint(conf.projectId, name);
  let response: Response;

  if (authenticated) {
    response = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
  } else if (session) {
    try {
      response = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
    } catch {
      response = await fetch(url, { cache: 'no-store' });
    }
  } else {
    response = await fetch(url, { cache: 'no-store' });
  }

  if (response.status === 404) return null;
  const data = await checked(response);
  return JSON.parse(data.fields?.payload?.stringValue || '{}');
}

export async function loadOnlineContent(): Promise<Partial<SiteContent> | null> {
  if (!isFirebaseConfigured() || isTrustedPreviewEnvironment()) return null;
  return readDocument('publicContent');
}

export async function loadPrivateStudents(): Promise<SiteContent['students']> {
  if (isTrustedPreviewEnvironment()) return [];
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách học sinh.');
  }
  const data = await readDocument('privateStudents', true);
  if (data === null) {
    return [];
  }
  if (!Array.isArray(data.students)) {
    throw new Error('Dữ liệu học sinh trên Firebase không đúng định dạng.');
  }
  return data.students;
}

async function writeDocument(name: string, payload: object) {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không được ghi dữ liệu lên Cloud Firestore Production.');
  }
  if (!session) throw new Error('Phiên quản trị không hợp lệ. Hãy đăng nhập lại.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Thiếu Project ID Firebase.');

  const url = documentEndpoint(conf.projectId, name) + '?updateMask.fieldPaths=payload';
  const response = await authenticatedFirestoreFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(payload) } } }),
  });

  await checked(response);
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
  const validatedStudents = deduplicateStudents(students);
  if (validatedStudents.length === 0) {
    throw new Error('Danh sách học sinh không có bản ghi hợp lệ để lưu lên Firebase.');
  }
  await writeDocument('privateStudents', { students: validatedStudents });
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

  const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });

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

  const res = await authenticatedFirestoreFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        updatedAt: { stringValue: nowIso },
      },
    }),
  });

  await checked(res);
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
  const res = await authenticatedFirestoreFetch(url, { method: 'DELETE' });
  await checked(res);
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

  const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });

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

  const res = await authenticatedFirestoreFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        updatedAt: { stringValue: nowIso },
      },
    }),
  });

  await checked(res);
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
  const res = await authenticatedFirestoreFetch(url, { method: 'DELETE' });
  await checked(res);
}

/* ==========================================================================
   Student Results Safe Migration & Sync (studentResults/{studentId})
   - Giữ nguyên tuyệt đối siteData/privateStudents (không xóa, không ghi đè rỗng)
   - Di chuyển / đồng bộ từng học sinh bằng document ID ổn định (idempotent, 0 trùng lặp)
   ========================================================================== */

export function buildStudentResultRecord(student: StudentRecord): StudentResultRecord {
  const studentId = toSafeStudentResultDocId(student);
  const rawCode = (student.studentCode || studentId).trim();
  const safeCode = (rawCode.length >= 2 ? rawCode : studentId).slice(0, 40);
  const rawName = (student.fullName || 'Chưa cập nhật').trim();
  const safeName = (rawName.length >= 2 ? rawName : `${rawName} -`).slice(0, 120);
  const rawClass = (student.className || 'Chưa rõ').trim();
  const safeClass = (rawClass.length >= 1 ? rawClass : 'Chưa rõ').slice(0, 30);

  return {
    studentId,
    studentCode: safeCode,
    fullName: safeName,
    className: safeClass,
    campus: (student.campus || 'Trường chính').trim().slice(0, 80),
    teacherName: (student.teacherName || 'Giáo viên chủ nhiệm').trim().slice(0, 120),
    academicEvaluation: String(student.academicEvaluation || 'Hoàn thành').trim().slice(0, 60) as StudentRecord['academicEvaluation'],
    conductEvaluation: String(student.conductEvaluation || 'Đạt').trim().slice(0, 60) as StudentRecord['conductEvaluation'],
    awards: (student.awards || '').trim().slice(0, 500),
    teacherComment: (student.teacherComment || '').trim().slice(0, 1000),
    academicYear: (student.academicYear || '2026 - 2027').trim().slice(0, 30),
    semester: (student.semester || 'Cả năm').trim().slice(0, 40),
    updatedAt: new Date().toISOString().slice(0, 40),
  };
}

export interface StudentMigrationReport {
  totalInput: number;
  syncedCount: number;
  verifiedCount: number;
  verifiedMatchedCount: number;
  missingVerifiedIds: string[];
  originalCountBefore: number;
  originalCountAfter: number;
  originalIntact: boolean;
  syncedIds: string[];
  failedItems: { studentCode: string; reason: string }[];
}

export async function syncStudentsToStudentResults(
  students: StudentRecord[]
): Promise<StudentMigrationReport> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không đồng bộ studentResults lên Firebase Production.');
  }
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới có quyền đồng bộ kết quả học tập.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) {
    throw new Error('Chưa cấu hình Firebase Project ID.');
  }

  const deduped = deduplicateStudents(students || []);
  if (deduped.length === 0) {
    throw new Error('Không có bản ghi học sinh hợp lệ để đồng bộ sang studentResults.');
  }

  const syncedIds: string[] = [];
  const failedItems: { studentCode: string; reason: string }[] = [];

  for (const st of deduped) {
    const record = buildStudentResultRecord(st);
    const url = documentByIdEndpoint(conf.projectId, 'studentResults', record.studentId);
    try {
      const res = await authenticatedFirestoreFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(record) }),
      });
      await checked(res);
      syncedIds.push(record.studentId);
    } catch (err: any) {
      failedItems.push({
        studentCode: record.studentCode,
        reason: err?.message || 'Lỗi ghi Firestore',
      });
    }
  }

  let verifiedCount = 0;
  let verifiedMatchedCount = 0;
  let missingVerifiedIds: string[] = [];

  try {
    const existing = await fetchStudentResultsForAdmin();
    verifiedCount = existing.length;
    const existingIdSet = new Set(existing.map((item) => item.studentId));
    missingVerifiedIds = syncedIds.filter((id) => !existingIdSet.has(id));
    verifiedMatchedCount = syncedIds.length - missingVerifiedIds.length;
  } catch (verifyErr: any) {
    missingVerifiedIds = [...syncedIds];
    failedItems.push({
      studentCode: 'VERIFY',
      reason: verifyErr?.message || 'Không thể đọc lại collection studentResults để đối chiếu.',
    });
  }

  return {
    totalInput: deduped.length,
    syncedCount: syncedIds.length,
    verifiedCount,
    verifiedMatchedCount,
    missingVerifiedIds,
    originalCountBefore: deduped.length,
    originalCountAfter: deduped.length,
    originalIntact: true,
    syncedIds,
    failedItems,
  };
}

/**
 * Quy trình chuyển đổi có kiểm soát từ dữ liệu gốc siteData/privateStudents sang studentResults/{studentId}:
 * 1. Đọc trực tiếp danh sách gốc từ siteData/privateStudents (không dùng nháp chưa lưu).
 * 2. Sao chép an toàn từng học sinh bằng ID ổn định sang studentResults/{studentId}.
 * 3. Đọc lại studentResults để đối chiếu từng bản ghi đã ghi đủ.
 * 4. Đọc lại siteData/privateStudents để xác nhận dữ liệu gốc vẫn còn nguyên vẹn 100% (không xóa).
 */
export async function migratePrivateStudentsToStudentResults(): Promise<StudentMigrationReport> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không chạy chuyển đổi dữ liệu trên Firebase Production.');
  }
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được phép sao chép dữ liệu sang studentResults.');
  }

  const originalBefore = await loadPrivateStudents();
  if (!Array.isArray(originalBefore) || originalBefore.length === 0) {
    throw new Error('Không tìm thấy dữ liệu học sinh gốc trong siteData/privateStudents để sao chép.');
  }

  const report = await syncStudentsToStudentResults(originalBefore);

  const originalAfter = await loadPrivateStudents();
  const originalCountBefore = originalBefore.length;
  const originalCountAfter = Array.isArray(originalAfter) ? originalAfter.length : 0;
  const originalIntact = originalCountAfter === originalCountBefore;

  return {
    ...report,
    originalCountBefore,
    originalCountAfter,
    originalIntact,
  };
}

export async function fetchStudentResultsForAdmin(): Promise<StudentResultRecord[]> {
  if (isTrustedPreviewEnvironment()) return [];
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được đọc danh sách studentResults.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];

  const allItems: StudentResultRecord[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    let url = `${collectionEndpoint(conf.projectId, 'studentResults')}?pageSize=100`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
    if (res.status === 404) break;
    const data = await checked(res);
    const docs: any[] = data.documents || [];
    for (const d of docs) {
      const p = fromFirestoreDocument(d);
      allItems.push({
        studentId: p.studentId || p.id,
        studentCode: p.studentCode || p.id,
        fullName: p.fullName || '',
        className: p.className || '',
        campus: p.campus || 'Trường chính',
        teacherName: p.teacherName || '',
        academicEvaluation: (p.academicEvaluation || 'Hoàn thành') as StudentResultRecord['academicEvaluation'],
        conductEvaluation: (p.conductEvaluation || 'Đạt') as StudentResultRecord['conductEvaluation'],
        awards: p.awards || '',
        teacherComment: p.teacherComment || '',
        academicYear: p.academicYear || '2026 - 2027',
        semester: p.semester || 'Cả năm',
        updatedAt: p.updatedAt || '',
      });
    }
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < 10);

  return allItems;
}

/* ==========================================================================
   Parent Links Management (parentLinks/{parentUid} - Admin Only)
   ========================================================================== */

export async function fetchParentLinksForAdmin(): Promise<ParentLinkRecord[]> {
  if (isTrustedPreviewEnvironment()) return [];
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được xem danh sách liên kết phụ huynh.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];

  const url = `${collectionEndpoint(conf.projectId, 'parentLinks')}?pageSize=100`;
  const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
  if (res.status === 404) return [];
  const data = await checked(res);
  const docs: any[] = data.documents || [];

  const items: ParentLinkRecord[] = docs.map((d) => {
    const p = fromFirestoreDocument(d);
    return {
      parentUid: p.parentUid || p.id,
      parentEmail: p.parentEmail || '',
      parentName: p.parentName || '',
      studentIds: Array.isArray(p.studentIds) ? p.studentIds : [],
      studentCodes: Array.isArray(p.studentCodes) ? p.studentCodes : [],
      updatedAt: p.updatedAt || '',
      updatedBy: p.updatedBy || '',
    };
  });

  items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return items;
}

export async function saveParentLinkForAdmin(input: {
  parentUid: string;
  parentEmail: string;
  parentName?: string;
  studentIds: string[];
  studentCodes: string[];
}): Promise<ParentLinkRecord> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Chế độ xem trước AI Studio không ghi parentLinks lên Firebase Production.');
  }
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được liên kết tài khoản phụ huynh.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const parentUid = input.parentUid.trim();
  const parentEmail = input.parentEmail.trim();
  const parentName = (input.parentName || '').trim().slice(0, 120);
  const uniqueIds = Array.from(new Set(input.studentIds.map((id) => id.trim()).filter(Boolean)));
  const uniqueCodes = Array.from(
    new Set(input.studentCodes.map((c) => c.trim().slice(0, 40)).filter(Boolean))
  ).slice(0, 10);

  if (!/^[a-zA-Z0-9_-]{6,128}$/.test(parentUid)) {
    throw new Error('UID tài khoản phụ huynh không hợp lệ (chỉ gồm chữ, số, _, - từ 6–128 ký tự; lấy từ Firebase Console → Authentication → Users).');
  }
  if (!parentEmail.includes('@') || parentEmail.length < 5 || parentEmail.length > 120) {
    throw new Error('Email phụ huynh không hợp lệ.');
  }
  if (uniqueIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 học sinh để liên kết với tài khoản phụ huynh này.');
  }
  if (uniqueIds.length > 10) {
    throw new Error('Mỗi tài khoản phụ huynh chỉ được liên kết tối đa 10 học sinh.');
  }

  const record: ParentLinkRecord = {
    parentUid,
    parentEmail,
    parentName,
    studentIds: uniqueIds,
    studentCodes: uniqueCodes,
    updatedAt: new Date().toISOString().slice(0, 40),
    updatedBy: (session.email || '').trim().slice(0, 120),
  };

  const url = documentByIdEndpoint(conf.projectId, 'parentLinks', parentUid);
  const res = await authenticatedFirestoreFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(record) }),
  });
  await checked(res);
  return record;
}

export async function deleteParentLinkForAdmin(parentUid: string): Promise<void> {
  if (isTrustedPreviewEnvironment()) return;
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được hủy liên kết phụ huynh.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const url = documentByIdEndpoint(conf.projectId, 'parentLinks', parentUid.trim());
  const res = await authenticatedFirestoreFetch(url, { method: 'DELETE' });
  await checked(res);
}

/* ==========================================================================
   Document Submissions Moderation (documentSubmissions/{id} - Admin Only)
   ========================================================================== */

export async function fetchDocumentSubmissionsForAdmin(): Promise<DocumentSubmission[]> {
  if (isTrustedPreviewEnvironment()) return [];
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được xem danh sách học liệu chờ duyệt.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];

  const url = `${collectionEndpoint(conf.projectId, 'documentSubmissions')}?pageSize=100`;
  const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
  if (res.status === 404) return [];
  const data = await checked(res);
  const docs: any[] = data.documents || [];

  const items: DocumentSubmission[] = docs.map((d) => {
    const p = fromFirestoreDocument(d);
    return {
      id: p.id,
      title: p.title || '',
      category: (p.category || 'giao-an') as DocumentSubmission['category'],
      categoryLabel: p.categoryLabel || 'Tài Liệu Học Tập',
      description: p.description || '',
      fileType: p.fileType || 'Link trực tuyến',
      fileSize: p.fileSize || 'Liên kết trực tuyến',
      downloadUrl: p.downloadUrl || '',
      submittedByUid: p.submittedByUid || '',
      submittedByEmail: p.submittedByEmail || '',
      submittedByName: p.submittedByName || '',
      status: (p.status === 'approved' || p.status === 'rejected' ? p.status : 'pending') as DocumentSubmission['status'],
      createdAt: p.createdAt || '',
      updatedAt: p.updatedAt || '',
      reviewNote: p.reviewNote || '',
      reviewedBy: p.reviewedBy || '',
      reviewedAt: p.reviewedAt || '',
    };
  });

  items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

export async function updateDocumentSubmissionStatusForAdmin(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  reviewNote = ''
): Promise<void> {
  if (isTrustedPreviewEnvironment()) return;
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được duyệt học liệu.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const nowIso = new Date().toISOString();
  const url =
    documentByIdEndpoint(conf.projectId, 'documentSubmissions', id) +
    '?updateMask.fieldPaths=status&updateMask.fieldPaths=reviewNote&updateMask.fieldPaths=reviewedBy&updateMask.fieldPaths=reviewedAt&updateMask.fieldPaths=updatedAt';

  const res = await authenticatedFirestoreFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: toFirestoreFields({
        status,
        reviewNote: reviewNote.trim().slice(0, 500),
        reviewedBy: session.email,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      }),
    }),
  });
  await checked(res);
}

export async function deleteDocumentSubmissionForAdmin(id: string): Promise<void> {
  if (isTrustedPreviewEnvironment()) return;
  if (!session || !hasPermission('admin')) {
    throw new Error('Từ chối truy cập: Chỉ Quản trị viên mới được xóa đề xuất học liệu.');
  }
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const url = documentByIdEndpoint(conf.projectId, 'documentSubmissions', id);
  const res = await authenticatedFirestoreFetch(url, { method: 'DELETE' });
  await checked(res);
}

/* ==========================================================================
   Member Profiles Listing (memberProfiles/{uid} - Admin Only)
   ========================================================================== */

export async function fetchMemberProfilesForAdmin(): Promise<MemberUser[]> {
  if (isTrustedPreviewEnvironment()) return [];
  if (!session || !hasPermission('admin')) return [];
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];

  const url = `${collectionEndpoint(conf.projectId, 'memberProfiles')}?pageSize=100`;
  const res = await authenticatedFirestoreFetch(url, { cache: 'no-store' });
  if (res.status === 404) return [];
  const data = await checked(res);
  const docs: any[] = data.documents || [];

  const items: MemberUser[] = docs.map((d) => {
    const p = fromFirestoreDocument(d);
    return {
      id: p.uid || p.id,
      uid: p.uid || p.id,
      email: p.email || '',
      name: p.displayName || p.email || 'Thành viên',
      role: 'Thành viên',
      photoURL: p.photoURL || undefined,
      provider: p.provider === 'password' ? 'password' : 'google',
      loginAt: p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString('vi-VN') : '',
    };
  });

  items.sort((a, b) => (b.loginAt || '').localeCompare(a.loginAt || ''));
  return items;
}

