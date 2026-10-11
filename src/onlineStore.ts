import type { SiteContent } from './types';

// Firebase REST APIs: no privileged key or service-account credential is shipped to visitors.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const adminEmail = import.meta.env.VITE_FIREBASE_ADMIN_EMAIL as string | undefined;
export const onlineEnabled = Boolean(apiKey && projectId && adminEmail);
let session: { idToken: string; uid: string; email: string } | null = null;
const authEndpoint = () => `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey!)}`;
const documentEndpoint = (name: string) => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/siteData/${name}`;

async function checked(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

export async function loginOnline(email: string, password: string): Promise<void> {
  if (!onlineEnabled) throw new Error('Chưa cấu hình Firebase. Xem HUONG_DAN_FIREBASE.md.');
  if (email.trim().toLowerCase() !== adminEmail!.trim().toLowerCase()) throw new Error('Tài khoản không được phép quản trị.');
  const auth = await checked(await fetch(authEndpoint(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
  }));
  session = { idToken: auth.idToken, uid: auth.localId, email: auth.email };
}
export function logoutOnline(): void { session = null; }
export function isOnlineAuthenticated(): boolean { return Boolean(session); }

async function readDocument(name: string, authenticated = false): Promise<any | null> {
  const response = await fetch(documentEndpoint(name), {
    cache: 'no-store',
    headers: authenticated && session ? { Authorization: `Bearer ${session.idToken}` } : {},
  });
  if (response.status === 404) return null;
  const data = await checked(response);
  return JSON.parse(data.fields?.payload?.stringValue || '{}');
}
export async function loadOnlineContent(): Promise<Partial<SiteContent> | null> {
  if (!onlineEnabled) return null;
  return readDocument('publicContent');
}
export async function loadPrivateStudents(): Promise<SiteContent['students'] | null> {
  if (!session) throw new Error('Bạn chưa đăng nhập quản trị trực tuyến.');
  const data = await readDocument('privateStudents', true);
  return data?.students || null;
}
async function writeDocument(name: string, payload: object) {
  if (!session) throw new Error('Phiên quản trị không hợp lệ. Hãy đăng nhập lại.');
  await checked(await fetch(documentEndpoint(name) + '?updateMask.fieldPaths=payload', {
    method: 'PATCH', headers: { Authorization: `Bearer ${session.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(payload) } } }),
  }));
}
export async function saveOnlineContent(content: SiteContent): Promise<void> {
  if (!onlineEnabled || !session) throw new Error('Chưa đăng nhập Firebase; dữ liệu chưa được đăng trực tuyến.');
  // Children's evaluations must NEVER be readable anonymously.
  const { students, ...publicContent } = content;
  // Save private data first. A failed public write must be reported to the admin.
  await writeDocument('privateStudents', { students });
  await writeDocument('publicContent', publicContent);
}
