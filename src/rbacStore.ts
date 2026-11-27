import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirebaseConfig, getOnlineSession, getValidIdToken, isFirebaseConfigured } from './onlineStore';
import { isTrustedPreviewEnvironment } from './authEnvironment';
import { validateHttpsImageUrl, parseYouTubeUrl } from './mediaHelpers';
import { validateDocumentUrl } from './urlValidation';
import type {
  ActivityCategorySlug,
  EditablePublicSectionId,
  EditorialLogAction,
  EditorialLogRecord,
  FirestoreActivityItem,
  FirestoreDocumentRecord,
  FirestoreGalleryRecord,
  FirestoreNewsItem,
  FirestoreSectionContentRecord,
  GranularPublicBundle,
  PermissionMatrix,
  PublishStatus,
  RbacRole,
  RegisteredAccountSummary,
  RoleInvitationRecord,
  UserRoleRecord,
} from './rbacTypes';
import { sanitizePermissionMatrix } from './rbacTypes';
import type { GalleryAlbumPhoto } from './types';

interface ActiveActorContext {
  idToken: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  source: 'firebase_sdk' | 'online_rest';
}

const OFFICIAL_BOOTSTRAP_SUPER_ADMIN_EMAIL = 'truongthleloipongdrang@gmail.com';

function firestoreBaseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
}

function toFsValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFsValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFsValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFsFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFsValue(v);
    }
  }
  return fields;
}

function fromFsValue(v: any): any {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) {
    return Array.isArray(v.arrayValue?.values)
      ? v.arrayValue.values.map((item: any) => fromFsValue(item))
      : [];
  }
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFsValue(fv);
    }
    return out;
  }
  return undefined;
}

function fromFsDoc(doc: any): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = doc?.fields || {};
  for (const [k, fv] of Object.entries(fields)) {
    out[k] = fromFsValue(fv);
  }
  if (typeof doc?.name === 'string') {
    const parts = doc.name.split('/');
    out._docId = parts[parts.length - 1];
  }
  return out;
}

function parseJwtClaims(token: string): Record<string, any> | null {
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

function mapFirestoreHttpError(status: number, rawMessage: string): Error {
  if (status === 401 || rawMessage.includes('UNAUTHENTICATED')) {
    return new Error('Phiên đăng nhập Firebase đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('Missing or insufficient permissions')) {
    return new Error(
      'Từ chối quyền truy cập trên Firebase (PERMISSION_DENIED). Tài khoản không có quyền thực hiện thao tác này hoặc quyền đã bị thu hồi.'
    );
  }
  return new Error(rawMessage || `Lỗi Firestore HTTP ${status}`);
}

async function checkedJson(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw mapFirestoreHttpError(res.status, msg);
  }
  return data;
}

const FIREBASE_CLIENT_APP_NAME = 'th-le-loi-client';

function getOrInitFirebaseClientApp(): FirebaseApp | null {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) {
    return null;
  }

  const apps = getApps();
  const namedApp = apps.find((a) => a.name === FIREBASE_CLIENT_APP_NAME);
  if (namedApp) return getApp(FIREBASE_CLIENT_APP_NAME);
  if (apps.length > 0) return apps[0];

  const conf = getFirebaseConfig();
  const envAuthDomain = ((import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '').trim();
  const authDomain = envAuthDomain || (conf.projectId ? `${conf.projectId}.firebaseapp.com` : '');
  if (!conf.apiKey || !conf.projectId || !authDomain) {
    return null;
  }

  return initializeApp(
    {
      apiKey: conf.apiKey,
      projectId: conf.projectId,
      authDomain,
    },
    FIREBASE_CLIENT_APP_NAME
  );
}

/**
 * Lấy Firebase ID Token thật trực tiếp từ phiên Firebase Authentication SDK đang hoạt động.
 * Sử dụng cùng thực thể FirebaseApp ('th-le-loi-client') với firebaseAuthStore.ts nên tương thích
 * hoàn toàn ngay cả khi firebaseAuthStore.ts được bảo vệ bởi workflow đồng bộ.
 */
async function readCurrentFirebaseSdkUserToken(forceRefresh = false): Promise<{
  idToken: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
} | null> {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) {
    return null;
  }
  try {
    const app = getOrInitFirebaseClientApp();
    if (!app) return null;
    const auth = getAuth(app);
    if (!auth.currentUser && typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const user = auth.currentUser;
    if (!user || !user.email) return null;
    const idToken = await user.getIdToken(forceRefresh);
    if (!idToken) return null;
    return {
      idToken,
      uid: user.uid,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      displayName: user.displayName || user.email.split('@')[0] || 'Thành viên',
      photoURL: user.photoURL || '',
    };
  } catch {
    return null;
  }
}

/**
 * Lấy ngữ cảnh xác thực Firebase hiện hành:
 * - Ưu tiên phiên Firebase Auth SDK (Google Sign-In / Email-Password SDK) nếu có.
 * - Hoặc phiên quản trị Email/Password từ onlineStore.ts.
 * Cho phép cả Admin đăng nhập Email/Password lẫn Super Admin / Giáo viên đăng nhập Google dùng chung 1 lớp RBAC chuẩn Firestore.
 */
export async function resolveActiveActorContext(
  preferAdminRestSession = false
): Promise<ActiveActorContext | null> {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) {
    return null;
  }

  const readOnlineRest = async (): Promise<ActiveActorContext | null> => {
    const onlineSess = getOnlineSession();
    if (!onlineSess) return null;
    try {
      const idToken = await getValidIdToken();
      const claims = parseJwtClaims(idToken);
      return {
        idToken,
        uid: onlineSess.uid,
        email: onlineSess.email,
        emailVerified: Boolean(claims?.email_verified),
        displayName: onlineSess.email.split('@')[0] || 'Quản trị viên',
        photoURL: '',
        source: 'online_rest',
      };
    } catch {
      return null;
    }
  };

  const readFirebaseSdk = async (): Promise<ActiveActorContext | null> => {
    const sdk = await readCurrentFirebaseSdkUserToken();
    if (!sdk) return null;
    return {
      ...sdk,
      source: 'firebase_sdk',
    };
  };

  if (preferAdminRestSession) {
    return (await readOnlineRest()) || (await readFirebaseSdk());
  }
  return (await readFirebaseSdk()) || (await readOnlineRest());
}

async function fetchDocRest(
  collectionName: string,
  docId: string,
  token?: string
): Promise<Record<string, any> | null> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) return null;
  const url = `${firestoreBaseUrl(conf.projectId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (res.status === 404) return null;
  const data = await checkedJson(res);
  return fromFsDoc(data);
}

async function listCollectionRest(
  collectionName: string,
  token?: string,
  maxPages = 5
): Promise<Record<string, any>[]> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];

  const all: Record<string, any>[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    let url = `${firestoreBaseUrl(conf.projectId)}/${encodeURIComponent(collectionName)}?pageSize=100`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.status === 404) break;
    const data = await checkedJson(res);
    const docs: any[] = data.documents || [];
    for (const d of docs) {
      all.push(fromFsDoc(d));
    }
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < maxPages);

  return all;
}

async function queryPublishedCollectionRest(
  collectionName: string,
  token?: string
): Promise<Record<string, any>[]> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];
  const url = `${firestoreBaseUrl(conf.projectId)}:runQuery`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    cache: 'no-store',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
        limit: 200,
      },
    }),
  });
  if (!res.ok) {
    return [];
  }
  const rows = await res.json().catch(() => []);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row: any) => row && row.document)
    .map((row: any) => fromFsDoc(row.document));
}

async function queryOwnDraftsRest(
  collectionName: string,
  authorUid: string,
  token: string
): Promise<Record<string, any>[]> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) return [];
  const url = `${firestoreBaseUrl(conf.projectId)}:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'authorUid' },
            op: 'EQUAL',
            value: { stringValue: authorUid },
          },
        },
        limit: 200,
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json().catch(() => []);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row: any) => row && row.document)
    .map((row: any) => fromFsDoc(row.document));
}

async function writeDocRest(
  collectionName: string,
  docId: string,
  payload: Record<string, unknown>,
  token: string
): Promise<void> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const url = `${firestoreBaseUrl(conf.projectId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: toFsFields(payload) }),
  });
  await checkedJson(res);
}

async function deleteDocRest(
  collectionName: string,
  docId: string,
  token: string
): Promise<void> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const url = `${firestoreBaseUrl(conf.projectId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkedJson(res);
}

function firestoreDocPath(projectId: string, collectionName: string, docId: string): string {
  return `projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
}

interface AtomicCommitLogMeta {
  logId: string;
  actor: ActiveActorContext;
  action: EditorialLogAction;
  section: string;
  targetCollection:
    | 'newsItems'
    | 'activityItems'
    | 'galleryItems'
    | 'documentItems'
    | 'sectionContents'
    | 'userRoles'
    | 'roleInvitations';
  targetId: string;
  targetTitle: string;
  summary: string;
  createdAtIso: string;
}

function buildEditorialLogCommitWrite(
  projectId: string,
  meta: AtomicCommitLogMeta
): Record<string, unknown> {
  return {
    update: {
      name: firestoreDocPath(projectId, 'editorialLogs', meta.logId),
      fields: toFsFields({
        actorUid: meta.actor.uid,
        actorEmail: meta.actor.email,
        action: meta.action,
        section: meta.section.slice(0, 60),
        targetCollection: meta.targetCollection,
        targetId: meta.targetId.slice(0, 128),
        targetTitle: meta.targetTitle.trim().slice(0, 240) || '(Không tiêu đề)',
        summary: meta.summary.trim().slice(0, 600),
        createdAt: meta.createdAtIso.slice(0, 40),
      }),
    },
    updateTransforms: [
      {
        fieldPath: 'recordedAt',
        setToServerValue: 'REQUEST_TIME',
      },
    ],
  };
}

/**
 * Thực thi giao dịch nguyên tử (atomic batch commit) trên Firestore REST v1:
 * Ghi tài liệu đích + bản ghi editorialLogs (với recordedAt = REQUEST_TIME) trong CÙNG 1 transaction.
 */
async function commitWritesRest(
  writes: Record<string, unknown>[],
  token: string
): Promise<void> {
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const url = `${firestoreBaseUrl(conf.projectId)}:commit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ writes }),
  });
  await checkedJson(res);
}

function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

/* ============================================================================
 * 1. ĐỌC VAI TRÒ & QUYỀN CHÍNH THỨC CỦA NGƯỜI DÙNG HIỆN TẠI TỪ /userRoles/{uid}
 * ============================================================================ */

export function parseUserRoleDoc(raw: Record<string, any>, fallbackUid: string): UserRoleRecord {
  const roleStr = String(raw.role || 'member');
  const role: RbacRole = (
    ['super_admin', 'admin', 'editor', 'member', 'viewer'].includes(roleStr) ? roleStr : 'member'
  ) as RbacRole;
  return {
    uid: String(raw.uid || raw._docId || fallbackUid),
    email: String(raw.email || ''),
    displayName: raw.displayName ? String(raw.displayName) : undefined,
    photoURL: raw.photoURL ? String(raw.photoURL) : undefined,
    role,
    enabled: raw.enabled !== false,
    permissions: sanitizePermissionMatrix(raw.permissions),
    updatedAt: String(raw.updatedAt || ''),
    updatedBy: String(raw.updatedBy || ''),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

export async function fetchCurrentUserRoleRecord(
  preferAdminRestSession = false
): Promise<UserRoleRecord | null> {
  if (isTrustedPreviewEnvironment()) {
    return null;
  }
  const actor = await resolveActiveActorContext(preferAdminRestSession);
  if (!actor) return null;

  const claims = parseJwtClaims(actor.idToken);
  const claimRole = claims?.role as RbacRole | undefined;
  const isOfficialBootstrap =
    actor.emailVerified &&
    actor.email.trim().toLowerCase() === OFFICIAL_BOOTSTRAP_SUPER_ADMIN_EMAIL;

  let docRecord: UserRoleRecord | null = null;
  try {
    const raw = await fetchDocRest('userRoles', actor.uid, actor.idToken);
    if (raw) {
      docRecord = parseUserRoleDoc(raw, actor.uid);
    }
  } catch {
    docRecord = null;
  }

  // Khi /userRoles/{uid} tồn tại, nó luôn là nguồn sự thật ưu tiên (tôn trọng enabled === false & mọi hạ cấp vai trò,
  // tuyệt đối không để Custom Claims cũ hoặc bootstrap email vượt qua bản ghi /userRoles/{uid})
  if (docRecord) {
    return docRecord;
  }

  // Chỉ áp dụng Custom Claims hoặc bootstrap chính thức khi CHƯA có bản ghi /userRoles/{uid}
  if (claimRole === 'super_admin' || isOfficialBootstrap) {
    return {
      uid: actor.uid,
      email: actor.email,
      displayName: actor.displayName,
      photoURL: actor.photoURL || undefined,
      role: 'super_admin',
      enabled: true,
      permissions: {},
      updatedAt: new Date().toISOString(),
      updatedBy: claimRole === 'super_admin' ? 'firebase-custom-claims' : 'system-bootstrap',
    };
  }

  if (claimRole && ['admin', 'editor', 'viewer'].includes(claimRole)) {
    return {
      uid: actor.uid,
      email: actor.email,
      displayName: actor.displayName,
      photoURL: actor.photoURL || undefined,
      role: claimRole,
      enabled: true,
      permissions: {},
      updatedAt: new Date().toISOString(),
      updatedBy: 'firebase-custom-claims',
    };
  }

  return {
    uid: actor.uid,
    email: actor.email,
    displayName: actor.displayName,
    photoURL: actor.photoURL || undefined,
    role: 'member',
    enabled: true,
    permissions: {},
    updatedAt: '',
    updatedBy: '',
  };
}

/* ============================================================================
 * 2. NHẬT KÝ BIÊN TẬP BẤT BIẾN (editorialLogs/{logId})
 * ============================================================================ */

export async function writeEditorialLog(input: {
  action: EditorialLogAction;
  section: string;
  targetId: string;
  targetTitle: string;
  summary: string;
  preferAdminRestSession?: boolean;
}): Promise<void> {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) return;
  const actor = await resolveActiveActorContext(Boolean(input.preferAdminRestSession));
  if (!actor) return;

  const logId = makeSafeDocId('log');
  const payload = {
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: input.action,
    section: input.section.slice(0, 60),
    targetId: input.targetId.slice(0, 128),
    targetTitle: input.targetTitle.trim().slice(0, 240) || '(Không tiêu đề)',
    summary: input.summary.trim().slice(0, 600),
    createdAt: new Date().toISOString().slice(0, 40),
  };

  try {
    await writeDocRest('editorialLogs', logId, payload, actor.idToken);
  } catch (err) {
    console.warn('Không thể ghi nhật ký editorialLogs:', err);
  }
}

export async function fetchEditorialLogsForSuperAdmin(): Promise<EditorialLogRecord[]> {
  if (isTrustedPreviewEnvironment()) return [];
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để xem nhật ký biên tập.');
  }
  const docs = await listCollectionRest('editorialLogs', actor.idToken, 5);
  const items: EditorialLogRecord[] = docs.map((d) => ({
    id: String(d._docId || ''),
    actorUid: String(d.actorUid || ''),
    actorEmail: String(d.actorEmail || ''),
    action: (d.action || 'update') as EditorialLogAction,
    section: String(d.section || ''),
    targetCollection: d.targetCollection ? String(d.targetCollection) : undefined,
    targetId: String(d.targetId || ''),
    targetTitle: String(d.targetTitle || ''),
    summary: String(d.summary || ''),
    createdAt: String(d.recordedAt || d.createdAt || ''),
    recordedAt: d.recordedAt ? String(d.recordedAt) : undefined,
  }));
  items.sort((a, b) => (b.recordedAt || b.createdAt).localeCompare(a.recordedAt || a.createdAt));
  return items;
}

/* ============================================================================
 * 3. QUẢN LÝ TÀI KHOẢN, LỜI MỜI & PHÂN QUYỀN (CHỈ SUPER ADMIN)
 * ============================================================================ */

export async function fetchAllRegisteredAccountsForSuperAdmin(): Promise<{
  accounts: RegisteredAccountSummary[];
  invitations: RoleInvitationRecord[];
  roles: UserRoleRecord[];
}> {
  if (isTrustedPreviewEnvironment()) {
    return { accounts: [], invitations: [], roles: [] };
  }
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để quản lý phân quyền.');
  }

  const [profileDocs, roleDocs, inviteDocs] = await Promise.all([
    listCollectionRest('memberProfiles', actor.idToken, 5).catch(() => []),
    listCollectionRest('userRoles', actor.idToken, 5),
    listCollectionRest('roleInvitations', actor.idToken, 5).catch(() => []),
  ]);

  const roles: UserRoleRecord[] = roleDocs.map((d) => parseUserRoleDoc(d, String(d._docId || '')));
  const roleByUid = new Map<string, UserRoleRecord>(roles.map((r) => [r.uid, r]));

  const profileByUid = new Map<string, Record<string, any>>();
  const profileByEmailLower = new Map<string, Record<string, any>>();
  for (const p of profileDocs) {
    const uid = String(p.uid || p._docId || '');
    if (!uid) continue;
    profileByUid.set(uid, p);
    const emailLower = String(p.email || '').trim().toLowerCase();
    if (emailLower) {
      profileByEmailLower.set(emailLower, p);
    }
  }

  const invitations: RoleInvitationRecord[] = inviteDocs.map((d) => ({
    id: String(d._docId || ''),
    email: String(d.email || ''),
    displayName: d.displayName ? String(d.displayName) : undefined,
    role: d.role === 'admin' ? 'admin' : 'editor',
    permissions: sanitizePermissionMatrix(d.permissions),
    status: (
      d.status === 'activated' || d.status === 'revoked' ? d.status : 'pending'
    ) as RoleInvitationRecord['status'],
    linkedUid: d.linkedUid ? String(d.linkedUid) : undefined,
    createdAt: String(d.createdAt || ''),
    createdBy: String(d.createdBy || ''),
    updatedAt: String(d.updatedAt || ''),
    notes: d.notes ? String(d.notes) : undefined,
  }));

  const seenUids = new Set<string>();
  const accounts: RegisteredAccountSummary[] = [];

  // 1. Tài khoản đã từng đăng nhập (memberProfiles) + ghép quyền userRoles nếu có
  for (const [uid, prof] of profileByUid.entries()) {
    seenUids.add(uid);
    const roleRec = roleByUid.get(uid);
    const role: RbacRole = roleRec ? roleRec.role : 'member';
    const enabled = roleRec ? roleRec.enabled : true;
    accounts.push({
      uid,
      email: String(prof.email || roleRec?.email || ''),
      displayName: String(prof.displayName || roleRec?.displayName || prof.email || 'Thành viên'),
      photoURL: prof.photoURL ? String(prof.photoURL) : roleRec?.photoURL,
      role,
      enabled,
      accountStatus: enabled ? 'active' : 'disabled',
      permissions: roleRec?.permissions || {},
      lastLoginAt: prof.lastLoginAt ? String(prof.lastLoginAt) : undefined,
      updatedAt: roleRec?.updatedAt,
      updatedBy: roleRec?.updatedBy,
      hasSignedIn: true,
      notes: roleRec?.notes,
    });
  }

  // 2. Các bản ghi userRoles chưa có trong memberProfiles (ví dụ Admin/Super Admin đăng nhập Email/Password)
  for (const roleRec of roles) {
    if (seenUids.has(roleRec.uid)) continue;
    seenUids.add(roleRec.uid);
    accounts.push({
      uid: roleRec.uid,
      email: roleRec.email,
      displayName: roleRec.displayName || roleRec.email || roleRec.uid,
      photoURL: roleRec.photoURL,
      role: roleRec.role,
      enabled: roleRec.enabled,
      accountStatus: roleRec.enabled ? 'active' : 'disabled',
      permissions: roleRec.permissions,
      updatedAt: roleRec.updatedAt,
      updatedBy: roleRec.updatedBy,
      hasSignedIn: true,
      notes: roleRec.notes,
    });
  }

  // 3. Lời mời đang chờ liên kết UID (roleInvitations status == 'pending')
  for (const inv of invitations) {
    if (inv.status !== 'pending') continue;
    const emailLower = inv.email.trim().toLowerCase();
    const matchedProfile = profileByEmailLower.get(emailLower);
    const matchedUid = matchedProfile ? String(matchedProfile.uid || matchedProfile._docId || '') : undefined;

    accounts.push({
      inviteId: inv.id,
      email: inv.email,
      displayName: inv.displayName || inv.email,
      photoURL: matchedProfile?.photoURL ? String(matchedProfile.photoURL) : undefined,
      role: inv.role,
      enabled: false,
      accountStatus: 'pending_invite',
      permissions: inv.permissions,
      updatedAt: inv.updatedAt,
      updatedBy: inv.createdBy,
      hasSignedIn: Boolean(matchedUid),
      matchingVerifiedProfileUid: matchedUid,
      matchingVerifiedProfileName: matchedProfile?.displayName ? String(matchedProfile.displayName) : undefined,
      matchingVerifiedProfilePhoto: matchedProfile?.photoURL ? String(matchedProfile.photoURL) : undefined,
      notes: inv.notes,
    });
  }

  const roleWeight: Record<RbacRole, number> = {
    super_admin: 5,
    admin: 4,
    editor: 3,
    viewer: 2,
    member: 1,
  };
  accounts.sort((a, b) => {
    if (a.accountStatus === 'pending_invite' && b.accountStatus !== 'pending_invite') return -1;
    if (b.accountStatus === 'pending_invite' && a.accountStatus !== 'pending_invite') return 1;
    const diff = (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0);
    if (diff !== 0) return diff;
    return (b.lastLoginAt || b.updatedAt || '').localeCompare(a.lastLoginAt || a.updatedAt || '');
  });

  return { accounts, invitations, roles };
}

export async function saveUserRoleForSuperAdmin(input: {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: RbacRole;
  enabled: boolean;
  permissions: PermissionMatrix;
  notes?: string;
  isNewGrant?: boolean;
}): Promise<UserRoleRecord> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Môi trường xem trước AI Studio không ghi bảng phân quyền lên Firebase Production.');
  }
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để cấp hoặc sửa quyền.');
  }

  const uid = input.uid.trim();
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(uid)) {
    throw new Error('UID Firebase Authentication không hợp lệ.');
  }
  const email = input.email.trim();
  if (!email || !email.includes('@') || email.length > 120) {
    throw new Error('Địa chỉ email không hợp lệ.');
  }

  const cleanPermissions = sanitizePermissionMatrix(input.permissions);
  const nowIso = new Date().toISOString().slice(0, 40);

  const payload: Record<string, unknown> = {
    uid,
    role: input.role,
    enabled: Boolean(input.enabled),
    email: email.slice(0, 120),
    permissions: cleanPermissions,
    updatedAt: nowIso,
    updatedBy: actor.email.slice(0, 120),
  };
  if (input.displayName) payload.displayName = input.displayName.trim().slice(0, 120);
  if (input.photoURL) payload.photoURL = input.photoURL.trim().slice(0, 500);
  if (input.notes) payload.notes = input.notes.trim().slice(0, 500);
  if (input.isNewGrant) payload.createdAt = nowIso;

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const logId = makeSafeDocId('log');
  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'userRoles', uid),
          fields: toFsFields(payload),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: input.isNewGrant ? 'role_grant' : 'role_update',
        section: 'user_roles',
        targetCollection: 'userRoles',
        targetId: uid,
        targetTitle: `${input.displayName || email} (${email})`,
        summary: `Vai trò=${input.role}, trạng thái=${input.enabled ? 'hoạt động' : 'tạm khóa'}, số mục=${Object.keys(cleanPermissions).length}`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return {
    uid,
    email,
    displayName: input.displayName,
    photoURL: input.photoURL,
    role: input.role,
    enabled: Boolean(input.enabled),
    permissions: cleanPermissions,
    updatedAt: nowIso,
    updatedBy: actor.email,
    createdAt: input.isNewGrant ? nowIso : undefined,
    notes: input.notes,
  };
}

export async function revokeUserRoleForSuperAdmin(
  uid: string,
  email: string,
  mode: 'disable' | 'delete' = 'disable'
): Promise<void> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Môi trường xem trước AI Studio không thay đổi phân quyền Production.');
  }
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để thu hồi quyền.');
  }
  const cleanUid = uid.trim();
  if (cleanUid === actor.uid) {
    throw new Error('Không cho phép tự thu hồi quyền SUPER ADMIN của chính phiên đang thao tác.');
  }

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const nowIso = new Date().toISOString().slice(0, 40);
  const logId = makeSafeDocId('log');
  const existing = await fetchDocRest('userRoles', cleanUid, actor.idToken);

  if (mode === 'delete') {
    const writes: Record<string, unknown>[] = [
      { delete: firestoreDocPath(conf.projectId, 'userRoles', cleanUid) },
    ];
    if (existing) {
      writes.push(
        buildEditorialLogCommitWrite(conf.projectId, {
          logId,
          actor,
          action: 'role_revoke',
          section: 'user_roles',
          targetCollection: 'userRoles',
          targetId: cleanUid,
          targetTitle: email || cleanUid,
          summary: 'Đã xóa hoàn toàn bản ghi phân quyền (trở về Thành viên)',
          createdAtIso: nowIso,
        })
      );
    }
    await commitWritesRest(writes, actor.idToken);
  } else {
    const writes: Record<string, unknown>[] = [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'userRoles', cleanUid),
          fields: toFsFields({
            uid: cleanUid,
            role: existing?.role || 'member',
            enabled: false,
            email: (existing?.email || email || '').slice(0, 120),
            permissions: {},
            updatedAt: nowIso,
            updatedBy: actor.email.slice(0, 120),
          }),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: existing ? 'role_revoke' : 'role_update',
        section: 'user_roles',
        targetCollection: 'userRoles',
        targetId: cleanUid,
        targetTitle: email || cleanUid,
        summary: 'Đã tạm khóa / thu hồi toàn bộ quyền biên tập (enabled=false)',
        createdAtIso: nowIso,
      }),
    ];
    await commitWritesRest(writes, actor.idToken);
  }
}

export async function createRoleInvitationForSuperAdmin(input: {
  email: string;
  displayName?: string;
  role: 'editor' | 'admin';
  permissions: PermissionMatrix;
  notes?: string;
}): Promise<RoleInvitationRecord> {
  if (isTrustedPreviewEnvironment()) {
    throw new Error('Môi trường xem trước AI Studio không tạo lời mời trên Firebase Production.');
  }
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để tạo lời mời giáo viên.');
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    throw new Error('Vui lòng nhập địa chỉ Gmail giáo viên hợp lệ.');
  }

  const inviteId = makeSafeDocId('inv');
  const nowIso = new Date().toISOString().slice(0, 40);
  const cleanPerms = sanitizePermissionMatrix(input.permissions);

  const payload: Record<string, unknown> = {
    email,
    role: input.role,
    permissions: cleanPerms,
    status: 'pending',
    createdAt: nowIso,
    createdBy: actor.email.slice(0, 120),
    updatedAt: nowIso,
  };
  if (input.displayName?.trim()) payload.displayName = input.displayName.trim().slice(0, 120);
  if (input.notes?.trim()) payload.notes = input.notes.trim().slice(0, 500);

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const logId = makeSafeDocId('log');
  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'roleInvitations', inviteId),
          fields: toFsFields(payload),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: 'role_grant',
        section: 'user_roles',
        targetCollection: 'roleInvitations',
        targetId: inviteId,
        targetTitle: `${input.displayName || email} (Lời mời chờ xác thực UID)`,
        summary: `Tạo lời mời vai trò ${input.role} cho ${email} (chưa kích hoạt cho đến khi đối chiếu UID Firebase Auth)`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return {
    id: inviteId,
    email,
    displayName: input.displayName?.trim(),
    role: input.role,
    permissions: cleanPerms,
    status: 'pending',
    createdAt: nowIso,
    createdBy: actor.email,
    updatedAt: nowIso,
    notes: input.notes?.trim(),
  };
}

export async function activateRoleInvitationWithVerifiedUid(
  invite: RoleInvitationRecord,
  verifiedUid: string,
  verifiedName?: string,
  verifiedPhoto?: string
): Promise<UserRoleRecord> {
  const actor = await resolveActiveActorContext(true);
  if (!actor) {
    throw new Error('Cần đăng nhập tài khoản SUPER ADMIN để kích hoạt quyền.');
  }

  const roleRecord = await saveUserRoleForSuperAdmin({
    uid: verifiedUid,
    email: invite.email,
    displayName: verifiedName || invite.displayName || invite.email,
    photoURL: verifiedPhoto,
    role: invite.role,
    enabled: true,
    permissions: invite.permissions,
    notes: invite.notes,
    isNewGrant: true,
  });

  const nowIso = new Date().toISOString().slice(0, 40);
  await writeDocRest(
    'roleInvitations',
    invite.id,
    {
      email: invite.email,
      ...(invite.displayName ? { displayName: invite.displayName } : {}),
      role: invite.role,
      permissions: invite.permissions,
      status: 'activated',
      linkedUid: verifiedUid,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy,
      updatedAt: nowIso,
      ...(invite.notes ? { notes: invite.notes } : {}),
    },
    actor.idToken
  );

  return roleRecord;
}

export async function deleteRoleInvitationForSuperAdmin(inviteId: string): Promise<void> {
  const actor = await resolveActiveActorContext(true);
  if (!actor) throw new Error('Cần đăng nhập tài khoản SUPER ADMIN.');
  await deleteDocRest('roleInvitations', inviteId, actor.idToken);
}

/* ============================================================================
 * 4. ĐỌC DỮ LIỆU CÔNG KHAI & DỮ LIỆU BIÊN TẬP THEO COLLECTION TÁCH RỜI
 * ============================================================================ */

function parseNewsDoc(d: Record<string, any>): FirestoreNewsItem {
  return {
    id: String(d.id || d._docId || ''),
    title: String(d.title || ''),
    category: (d.category || 'tin-tuc') as FirestoreNewsItem['category'],
    categoryLabel: String(d.categoryLabel || 'Tin Tức'),
    summary: String(d.summary || ''),
    content: String(d.content || ''),
    date: String(d.date || ''),
    author: String(d.author || ''),
    imageUrl: String(d.imageUrl || ''),
    isFeatured: Boolean(d.isFeatured),
    isExternalLink: Boolean(d.isExternalLink),
    externalUrl: d.externalUrl ? String(d.externalUrl) : undefined,
    sourceName: d.sourceName ? String(d.sourceName) : undefined,
    authorUid: String(d.authorUid || ''),
    authorEmail: String(d.authorEmail || ''),
    status: d.status === 'draft' ? 'draft' : 'published',
    createdAt: String(d.createdAt || ''),
    updatedAt: String(d.updatedAt || ''),
    updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
    updatedByEmail: d.updatedByEmail ? String(d.updatedByEmail) : undefined,
  };
}

function parseActivityDoc(d: Record<string, any>): FirestoreActivityItem {
  return {
    id: String(d.id || d._docId || ''),
    title: String(d.title || ''),
    category: (d.category || 'day-hoc') as ActivityCategorySlug,
    categoryLabel: String(d.categoryLabel || 'Dạy học & STEM'),
    date: String(d.date || ''),
    description: String(d.description || ''),
    content: d.content ? String(d.content) : undefined,
    imageUrl: String(d.imageUrl || ''),
    images: Array.isArray(d.images) ? d.images.map(String) : undefined,
    videoUrl: d.videoUrl ? String(d.videoUrl) : undefined,
    highlight: Boolean(d.highlight),
    order: typeof d.order === 'number' ? d.order : undefined,
    authorUid: String(d.authorUid || ''),
    authorEmail: String(d.authorEmail || ''),
    status: d.status === 'draft' ? 'draft' : 'published',
    createdAt: String(d.createdAt || ''),
    updatedAt: String(d.updatedAt || ''),
    updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
    updatedByEmail: d.updatedByEmail ? String(d.updatedByEmail) : undefined,
  };
}

function parseGalleryDoc(d: Record<string, any>): FirestoreGalleryRecord {
  let photos: GalleryAlbumPhoto[] | undefined;
  if (typeof d.photosJson === 'string' && d.photosJson.trim()) {
    try {
      const parsed = JSON.parse(d.photosJson);
      if (Array.isArray(parsed)) photos = parsed;
    } catch {
      photos = [];
    }
  }
  return {
    id: String(d.id || d._docId || ''),
    itemType: d.itemType === 'album' ? 'album' : 'photo',
    title: String(d.title || ''),
    category: String(d.category || 'hoat-dong'),
    date: String(d.date || ''),
    imageUrl: String(d.imageUrl || ''),
    caption: String(d.caption || ''),
    photos,
    order: typeof d.order === 'number' ? d.order : undefined,
    authorUid: String(d.authorUid || ''),
    authorEmail: String(d.authorEmail || ''),
    status: d.status === 'draft' ? 'draft' : 'published',
    createdAt: String(d.createdAt || ''),
    updatedAt: String(d.updatedAt || ''),
    updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
    updatedByEmail: d.updatedByEmail ? String(d.updatedByEmail) : undefined,
  };
}

function parseDocumentDoc(d: Record<string, any>): FirestoreDocumentRecord {
  return {
    id: String(d.id || d._docId || ''),
    title: String(d.title || ''),
    category: (d.category || 'giao-an') as FirestoreDocumentRecord['category'],
    categoryLabel: String(d.categoryLabel || 'Giáo Án & Phân Phối'),
    description: String(d.description || ''),
    fileType: String(d.fileType || 'PDF'),
    fileSize: String(d.fileSize || 'Liên kết trực tuyến'),
    downloadUrl: String(d.downloadUrl || ''),
    uploadDate: String(d.uploadDate || ''),
    uploaderName: String(d.uploaderName || ''),
    uploaderEmail: String(d.uploaderEmail || ''),
    downloadCount: typeof d.downloadCount === 'number' ? d.downloadCount : 0,
    authorUid: String(d.authorUid || ''),
    authorEmail: String(d.authorEmail || ''),
    status: d.status === 'draft' ? 'draft' : 'published',
    createdAt: String(d.createdAt || ''),
    updatedAt: String(d.updatedAt || ''),
    updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
    updatedByEmail: d.updatedByEmail ? String(d.updatedByEmail) : undefined,
  };
}

function parseSectionContentDoc(d: Record<string, any>): FirestoreSectionContentRecord | null {
  const sectionId = String(d.sectionId || d._docId || '') as EditablePublicSectionId;
  if (!['home', 'about', 'staff', 'admissions', 'contact', 'other'].includes(sectionId)) {
    return null;
  }
  let payloadObj: Record<string, unknown> = {};
  if (typeof d.payload === 'string') {
    try {
      payloadObj = JSON.parse(d.payload);
    } catch {
      payloadObj = {};
    }
  }
  return {
    sectionId,
    payload: payloadObj,
    authorUid: String(d.authorUid || ''),
    authorEmail: String(d.authorEmail || ''),
    status: d.status === 'draft' ? 'draft' : 'published',
    createdAt: String(d.createdAt || ''),
    updatedAt: String(d.updatedAt || ''),
    updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
    updatedByEmail: d.updatedByEmail ? String(d.updatedByEmail) : undefined,
  };
}

export async function fetchPublishedGranularContent(): Promise<GranularPublicBundle> {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) {
    return {
      newsItems: [],
      activityItems: [],
      galleryItems: [],
      documentItems: [],
      sectionContents: [],
    };
  }

  const [newsRaw, actRaw, galRaw, docRaw, secRaw] = await Promise.all([
    queryPublishedCollectionRest('newsItems').catch(() => []),
    queryPublishedCollectionRest('activityItems').catch(() => []),
    queryPublishedCollectionRest('galleryItems').catch(() => []),
    queryPublishedCollectionRest('documentItems').catch(() => []),
    queryPublishedCollectionRest('sectionContents').catch(() => []),
  ]);

  const newsItems = newsRaw.map(parseNewsDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activityItems = actRaw.map(parseActivityDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const galleryItems = galRaw.map(parseGalleryDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const documentItems = docRaw.map(parseDocumentDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sectionContents = secRaw
    .map(parseSectionContentDoc)
    .filter((x): x is FirestoreSectionContentRecord => x !== null);

  return {
    newsItems,
    activityItems,
    galleryItems,
    documentItems,
    sectionContents,
  };
}

async function fetchPublishedAndOwnDrafts(
  collectionName: string,
  actor: ActiveActorContext,
  isAdminActor: boolean
): Promise<Record<string, any>[]> {
  if (isAdminActor) {
    return listCollectionRest(collectionName, actor.idToken, 5).catch(() => []);
  }
  const [published, mine] = await Promise.all([
    queryPublishedCollectionRest(collectionName, actor.idToken).catch(() => []),
    queryOwnDraftsRest(collectionName, actor.uid, actor.idToken).catch(() => []),
  ]);
  const map = new Map<string, Record<string, any>>();
  for (const item of published) {
    const id = String(item.id || item._docId || '');
    if (id) map.set(id, item);
  }
  for (const item of mine) {
    const id = String(item.id || item._docId || '');
    if (id) map.set(id, item);
  }
  return Array.from(map.values());
}

export async function fetchEditorialWorkspaceBundle(
  isAdminActor: boolean
): Promise<GranularPublicBundle> {
  if (isTrustedPreviewEnvironment() || !isFirebaseConfigured()) {
    return {
      newsItems: [],
      activityItems: [],
      galleryItems: [],
      documentItems: [],
      sectionContents: [],
    };
  }
  const actor = await resolveActiveActorContext(isAdminActor);
  if (!actor) {
    throw new Error('Vui lòng đăng nhập tài khoản Google hoặc Quản trị trước khi tải không gian biên tập.');
  }

  const [newsRaw, actRaw, galRaw, docRaw, secRaw] = await Promise.all([
    fetchPublishedAndOwnDrafts('newsItems', actor, isAdminActor),
    fetchPublishedAndOwnDrafts('activityItems', actor, isAdminActor),
    fetchPublishedAndOwnDrafts('galleryItems', actor, isAdminActor),
    fetchPublishedAndOwnDrafts('documentItems', actor, isAdminActor),
    fetchPublishedAndOwnDrafts('sectionContents', actor, isAdminActor),
  ]);

  return {
    newsItems: newsRaw.map(parseNewsDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    activityItems: actRaw.map(parseActivityDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    galleryItems: galRaw.map(parseGalleryDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    documentItems: docRaw.map(parseDocumentDoc).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    sectionContents: secRaw
      .map(parseSectionContentDoc)
      .filter((x): x is FirestoreSectionContentRecord => x !== null),
  };
}

/* ============================================================================
 * 5. GHI & XÓA TRỰC TIẾP TỪNG MỤC NỘI DUNG (KHÔNG CHỜ DUYỆT + GHI NHẬT KÝ)
 * ============================================================================ */

export async function saveEditorialNewsItem(
  input: {
    id?: string;
    title: string;
    category: FirestoreNewsItem['category'];
    categoryLabel: string;
    summary: string;
    content: string;
    date: string;
    author: string;
    imageUrl: string;
    isFeatured?: boolean;
    isExternalLink?: boolean;
    externalUrl?: string;
    sourceName?: string;
    status: PublishStatus;
  },
  existing?: FirestoreNewsItem | null
): Promise<FirestoreNewsItem> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền trước khi lưu bài viết.');

  const title = input.title.trim();
  if (title.length < 3) throw new Error('Tiêu đề bài viết phải có ít nhất 3 ký tự.');
  const content = input.content.trim();
  if (content.length < 3) throw new Error('Nội dung bài viết không được để trống.');

  const imgCheck = validateHttpsImageUrl(input.imageUrl);
  if (!imgCheck.valid || !imgCheck.normalizedUrl) {
    throw new Error(imgCheck.error || 'URL ảnh đại diện ImageKit không hợp lệ (bắt buộc https://).');
  }
  if (input.externalUrl?.trim()) {
    const extCheck = validateDocumentUrl(input.externalUrl);
    if (!extCheck.valid || !extCheck.normalizedUrl?.startsWith('https://')) {
      throw new Error('Liên kết bài báo bên ngoài phải bắt đầu bằng https:// hợp lệ.');
    }
  }

  const isUpdate = Boolean(existing?.id);
  const id = isUpdate ? existing!.id : (input.id?.trim() || makeSafeDocId('news'));
  const nowIso = new Date().toISOString().slice(0, 40);

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const logId = makeSafeDocId('log');

  const record: FirestoreNewsItem = {
    id,
    title: title.slice(0, 240),
    category: input.category,
    categoryLabel: input.categoryLabel.trim().slice(0, 80) || 'Tin Tức',
    summary: (input.summary.trim() || content.slice(0, 180)).slice(0, 1000),
    content: content.slice(0, 30000),
    date: (input.date.trim() || new Date().toLocaleDateString('vi-VN')).slice(0, 40),
    author: (input.author.trim() || actor.displayName || actor.email).slice(0, 120),
    imageUrl: imgCheck.normalizedUrl,
    isFeatured: Boolean(input.isFeatured),
    isExternalLink: Boolean(input.isExternalLink || input.externalUrl?.trim()),
    ...(input.externalUrl?.trim() ? { externalUrl: input.externalUrl.trim().slice(0, 2048) } : {}),
    ...(input.sourceName?.trim() ? { sourceName: input.sourceName.trim().slice(0, 120) } : {}),
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status: input.status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
    ...(isUpdate ? { updatedByUid: actor.uid, updatedByEmail: actor.email } : {}),
  };

  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'newsItems', id),
          fields: toFsFields(record as unknown as Record<string, unknown>),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: isUpdate ? 'update' : 'create',
        section: 'news',
        targetCollection: 'newsItems',
        targetId: id,
        targetTitle: record.title,
        summary: `${isUpdate ? 'Cập nhật' : 'Đăng mới'} tin tức (${record.status === 'published' ? 'Xuất bản trực tiếp' : 'Bản nháp'})`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return record;
}

export async function deleteEditorialNewsItem(item: FirestoreNewsItem): Promise<void> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const nowIso = new Date().toISOString().slice(0, 40);

  await commitWritesRest(
    [
      { delete: firestoreDocPath(conf.projectId, 'newsItems', item.id) },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId: `del_n_${item.id}`,
        actor,
        action: 'delete',
        section: 'news',
        targetCollection: 'newsItems',
        targetId: item.id,
        targetTitle: item.title,
        summary: 'Đã xóa bài viết tin tức khỏi hệ thống',
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );
}

export async function saveEditorialActivityItem(
  input: {
    id?: string;
    title: string;
    category: ActivityCategorySlug;
    categoryLabel: string;
    date: string;
    description: string;
    content?: string;
    imageUrl: string;
    images?: string[];
    videoUrl?: string;
    highlight?: boolean;
    status: PublishStatus;
  },
  existing?: FirestoreActivityItem | null
): Promise<FirestoreActivityItem> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền trước khi lưu hoạt động.');

  const title = input.title.trim();
  if (title.length < 3) throw new Error('Tiêu đề hoạt động phải có ít nhất 3 ký tự.');
  const description = input.description.trim();
  if (description.length < 3) throw new Error('Mô tả hoạt động không được để trống.');

  const coverCheck = validateHttpsImageUrl(input.imageUrl);
  if (!coverCheck.valid || !coverCheck.normalizedUrl) {
    throw new Error(coverCheck.error || 'URL ảnh đại diện ImageKit không hợp lệ (bắt buộc https://).');
  }

  const cleanImages: string[] = [];
  for (const url of input.images || []) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    const chk = validateHttpsImageUrl(trimmed);
    if (!chk.valid || !chk.normalizedUrl) {
      throw new Error(`Ảnh phụ không hợp lệ (${trimmed}): ${chk.error}`);
    }
    cleanImages.push(chk.normalizedUrl);
  }

  let cleanVideoUrl: string | undefined;
  if (input.videoUrl?.trim()) {
    const yt = parseYouTubeUrl(input.videoUrl);
    if (!yt.valid) {
      throw new Error(yt.error || 'Liên kết video YouTube không hợp lệ.');
    }
    cleanVideoUrl = yt.watchUrl || yt.embedUrl;
  }

  const isUpdate = Boolean(existing?.id);
  const id = isUpdate ? existing!.id : (input.id?.trim() || makeSafeDocId('act'));
  const nowIso = new Date().toISOString().slice(0, 40);

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const logId = makeSafeDocId('log');

  const record: FirestoreActivityItem = {
    id,
    title: title.slice(0, 240),
    category: input.category,
    categoryLabel: input.categoryLabel.trim().slice(0, 80),
    date: (input.date.trim() || new Date().toLocaleDateString('vi-VN')).slice(0, 40),
    description: description.slice(0, 2000),
    ...(input.content?.trim() ? { content: input.content.trim().slice(0, 30000) } : {}),
    imageUrl: coverCheck.normalizedUrl,
    ...(cleanImages.length > 0 ? { images: cleanImages.slice(0, 30) } : {}),
    ...(cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {}),
    highlight: Boolean(input.highlight),
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status: input.status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
    ...(isUpdate ? { updatedByUid: actor.uid, updatedByEmail: actor.email } : {}),
  };

  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'activityItems', id),
          fields: toFsFields(record as unknown as Record<string, unknown>),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: isUpdate ? 'update' : 'create',
        section: `activities:${record.category}`,
        targetCollection: 'activityItems',
        targetId: id,
        targetTitle: record.title,
        summary: `${isUpdate ? 'Cập nhật' : 'Đăng mới'} hoạt động [${record.categoryLabel}] (${record.status === 'published' ? 'Xuất bản trực tiếp' : 'Bản nháp'})`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return record;
}

export async function deleteEditorialActivityItem(item: FirestoreActivityItem): Promise<void> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const nowIso = new Date().toISOString().slice(0, 40);

  await commitWritesRest(
    [
      { delete: firestoreDocPath(conf.projectId, 'activityItems', item.id) },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId: `del_a_${item.id}`,
        actor,
        action: 'delete',
        section: `activities:${item.category}`,
        targetCollection: 'activityItems',
        targetId: item.id,
        targetTitle: item.title,
        summary: `Đã xóa hoạt động [${item.categoryLabel}]`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );
}

export async function saveEditorialGalleryItem(
  input: {
    id?: string;
    itemType: 'photo' | 'album';
    title: string;
    category: string;
    date: string;
    imageUrl: string;
    caption: string;
    photos?: GalleryAlbumPhoto[];
    status: PublishStatus;
  },
  existing?: FirestoreGalleryRecord | null
): Promise<FirestoreGalleryRecord> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền trước khi lưu thư viện ảnh.');

  const title = input.title.trim();
  if (title.length < 2) throw new Error('Tiêu đề ảnh/album phải có ít nhất 2 ký tự.');

  const imgCheck = validateHttpsImageUrl(input.imageUrl);
  if (!imgCheck.valid || !imgCheck.normalizedUrl) {
    throw new Error(imgCheck.error || 'URL ảnh ImageKit không hợp lệ (bắt buộc https://).');
  }

  let cleanPhotos: GalleryAlbumPhoto[] | undefined;
  if (input.itemType === 'album') {
    cleanPhotos = [];
    for (const p of input.photos || []) {
      const chk = validateHttpsImageUrl(p.imageUrl);
      if (!chk.valid || !chk.normalizedUrl) {
        throw new Error(`Ảnh trong album không hợp lệ: ${chk.error}`);
      }
      cleanPhotos.push({
        id: p.id || makeSafeDocId('ap'),
        imageUrl: chk.normalizedUrl,
        title: p.title?.trim(),
        caption: p.caption?.trim(),
        date: p.date?.trim(),
      });
    }
  }

  const isUpdate = Boolean(existing?.id);
  const id = isUpdate ? existing!.id : (input.id?.trim() || makeSafeDocId(input.itemType === 'album' ? 'alb' : 'gal'));
  const nowIso = new Date().toISOString().slice(0, 40);

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const logId = makeSafeDocId('log');

  const fsPayload: Record<string, unknown> = {
    id,
    itemType: input.itemType,
    title: title.slice(0, 200),
    category: (input.category.trim() || 'hoat-dong').slice(0, 60),
    date: (input.date.trim() || new Date().toLocaleDateString('vi-VN')).slice(0, 40),
    imageUrl: imgCheck.normalizedUrl,
    caption: (input.caption || '').trim().slice(0, 2000),
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status: input.status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
  };
  if (cleanPhotos && cleanPhotos.length > 0) {
    fsPayload.photosJson = JSON.stringify(cleanPhotos);
  }
  if (isUpdate) {
    fsPayload.updatedByUid = actor.uid;
    fsPayload.updatedByEmail = actor.email;
  }

  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'galleryItems', id),
          fields: toFsFields(fsPayload),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: isUpdate ? 'update' : 'create',
        section: 'gallery',
        targetCollection: 'galleryItems',
        targetId: id,
        targetTitle: title,
        summary: `${isUpdate ? 'Cập nhật' : 'Đăng mới'} ${input.itemType === 'album' ? 'album ảnh' : 'ảnh thư viện'} (${input.status === 'published' ? 'Xuất bản trực tiếp' : 'Bản nháp'})`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return {
    id,
    itemType: input.itemType,
    title: title.slice(0, 200),
    category: (input.category.trim() || 'hoat-dong').slice(0, 60),
    date: (input.date.trim() || new Date().toLocaleDateString('vi-VN')).slice(0, 40),
    imageUrl: imgCheck.normalizedUrl,
    caption: (input.caption || '').trim().slice(0, 2000),
    photos: cleanPhotos,
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status: input.status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
    updatedByUid: isUpdate ? actor.uid : undefined,
    updatedByEmail: isUpdate ? actor.email : undefined,
  };
}

export async function deleteEditorialGalleryItem(item: FirestoreGalleryRecord): Promise<void> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const nowIso = new Date().toISOString().slice(0, 40);

  await commitWritesRest(
    [
      { delete: firestoreDocPath(conf.projectId, 'galleryItems', item.id) },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId: `del_g_${item.id}`,
        actor,
        action: 'delete',
        section: 'gallery',
        targetCollection: 'galleryItems',
        targetId: item.id,
        targetTitle: item.title,
        summary: `Đã xóa ${item.itemType === 'album' ? 'album ảnh' : 'ảnh thư viện'}`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );
}

export async function saveEditorialDocumentItem(
  input: {
    id?: string;
    title: string;
    category: FirestoreDocumentRecord['category'];
    categoryLabel: string;
    description: string;
    fileType: string;
    fileSize: string;
    downloadUrl: string;
    uploadDate?: string;
    uploaderName?: string;
    status: PublishStatus;
  },
  existing?: FirestoreDocumentRecord | null
): Promise<FirestoreDocumentRecord> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền trước khi đăng tài liệu.');

  const title = input.title.trim();
  if (title.length < 3) throw new Error('Tiêu đề tài liệu phải có ít nhất 3 ký tự.');
  const description = input.description.trim();
  if (description.length < 3) throw new Error('Mô tả tài liệu không được để trống.');

  const urlCheck = validateDocumentUrl(input.downloadUrl);
  if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.normalizedUrl.startsWith('https://')) {
    throw new Error(urlCheck.error || 'Đường dẫn tài liệu phải là URL HTTPS hợp lệ (https://...).');
  }

  const isUpdate = Boolean(existing?.id);
  const id = isUpdate ? existing!.id : (input.id?.trim() || makeSafeDocId('doc'));
  const nowIso = new Date().toISOString().slice(0, 40);

  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const logId = makeSafeDocId('log');

  const record: FirestoreDocumentRecord = {
    id,
    title: title.slice(0, 240),
    category: input.category,
    categoryLabel: input.categoryLabel.trim().slice(0, 80),
    description: description.slice(0, 2000),
    fileType: (input.fileType.trim() || 'PDF').slice(0, 40),
    fileSize: (input.fileSize.trim() || 'Liên kết trực tuyến').slice(0, 40),
    downloadUrl: urlCheck.normalizedUrl,
    uploadDate: (input.uploadDate?.trim() || new Date().toLocaleDateString('vi-VN')).slice(0, 40),
    uploaderName: (input.uploaderName?.trim() || actor.displayName || actor.email).slice(0, 120),
    uploaderEmail: (isUpdate ? existing!.uploaderEmail : actor.email).slice(0, 120),
    downloadCount: isUpdate ? existing!.downloadCount : 0,
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status: input.status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
    ...(isUpdate ? { updatedByUid: actor.uid, updatedByEmail: actor.email } : {}),
  };

  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'documentItems', id),
          fields: toFsFields(record as unknown as Record<string, unknown>),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: isUpdate ? 'update' : 'create',
        section: 'documents',
        targetCollection: 'documentItems',
        targetId: id,
        targetTitle: record.title,
        summary: `${isUpdate ? 'Cập nhật' : 'Đăng trực tiếp'} tài liệu [${record.fileType}] (${record.status === 'published' ? 'Xuất bản trực tiếp' : 'Bản nháp'})`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return record;
}

export async function deleteEditorialDocumentItem(item: FirestoreDocumentRecord): Promise<void> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const nowIso = new Date().toISOString().slice(0, 40);

  await commitWritesRest(
    [
      { delete: firestoreDocPath(conf.projectId, 'documentItems', item.id) },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId: `del_d_${item.id}`,
        actor,
        action: 'delete',
        section: 'documents',
        targetCollection: 'documentItems',
        targetId: item.id,
        targetTitle: item.title,
        summary: `Đã xóa tài liệu [${item.fileType}] khỏi Kho tài liệu`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );
}

export async function saveEditorialSectionContent(
  sectionId: EditablePublicSectionId,
  payload: Record<string, unknown>,
  status: PublishStatus,
  existing?: FirestoreSectionContentRecord | null
): Promise<FirestoreSectionContentRecord> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền trước khi lưu nội dung mục này.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');

  const serialized = JSON.stringify(payload);
  if (serialized.length >= 295000) {
    throw new Error('Dữ liệu mục này vượt quá giới hạn an toàn (300 KB).');
  }

  const isUpdate = Boolean(existing?.sectionId);
  const nowIso = new Date().toISOString().slice(0, 40);
  const logId = makeSafeDocId('log');

  const fsDoc: Record<string, unknown> = {
    sectionId,
    payload: serialized,
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
  };
  if (isUpdate) {
    fsDoc.updatedByUid = actor.uid;
    fsDoc.updatedByEmail = actor.email;
  }

  await commitWritesRest(
    [
      {
        update: {
          name: firestoreDocPath(conf.projectId, 'sectionContents', sectionId),
          fields: toFsFields(fsDoc),
        },
      },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: isUpdate ? 'update' : 'create',
        section: sectionId,
        targetCollection: 'sectionContents',
        targetId: sectionId,
        targetTitle: `Nội dung mục ${sectionId}`,
        summary: `${isUpdate ? 'Cập nhật' : 'Tạo mới'} nội dung công khai mục [${sectionId}] (${status === 'published' ? 'Xuất bản trực tiếp' : 'Bản nháp'})`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );

  return {
    sectionId,
    payload,
    authorUid: isUpdate ? existing!.authorUid : actor.uid,
    authorEmail: isUpdate ? existing!.authorEmail : actor.email,
    status,
    createdAt: isUpdate ? existing!.createdAt : nowIso,
    updatedAt: nowIso,
    lastLogId: logId,
    updatedByUid: isUpdate ? actor.uid : undefined,
    updatedByEmail: isUpdate ? actor.email : undefined,
  };
}

export async function deleteEditorialSectionContent(sectionId: EditablePublicSectionId): Promise<void> {
  const actor = await resolveActiveActorContext(false);
  if (!actor) throw new Error('Vui lòng đăng nhập tài khoản được cấp quyền.');
  const conf = getFirebaseConfig();
  if (!conf.projectId) throw new Error('Chưa cấu hình Firebase Project ID.');
  const nowIso = new Date().toISOString().slice(0, 40);
  const logId = makeSafeDocId('log');

  await commitWritesRest(
    [
      { delete: firestoreDocPath(conf.projectId, 'sectionContents', sectionId) },
      buildEditorialLogCommitWrite(conf.projectId, {
        logId,
        actor,
        action: 'delete',
        section: sectionId,
        targetCollection: 'sectionContents',
        targetId: sectionId,
        targetTitle: `Nội dung mục ${sectionId}`,
        summary: `Đã khôi phục/xóa bản ghi nội dung riêng của mục [${sectionId}]`,
        createdAtIso: nowIso,
      }),
    ],
    actor.idToken
  );
}

export function downloadRbacBackupJson(data: {
  roles: UserRoleRecord[];
  invitations: RoleInvitationRecord[];
  exportedBy: string;
}): void {
  const blob = {
    exportedAt: new Date().toISOString(),
    exportedBy: data.exportedBy,
    userRoles: data.roles,
    roleInvitations: data.invitations,
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(blob, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `rbac-backup-th-leloi-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
