import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseConfig, isFirebaseConfigured } from './onlineStore';
import { isTrustedPreviewEnvironment } from './authEnvironment';
import {
  validateDocumentSubmissionInput,
  type DocumentSubmissionInput,
} from './urlValidation';
import type {
  DocumentSubmission,
  MemberUser,
  ParentLinkRecord,
  ParentUser,
  StudentResultRecord,
} from './types';

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function getFirebaseClientConfig() {
  const conf = getFirebaseConfig();
  const envAuthDomain = ((import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '').trim();
  const authDomain = envAuthDomain || (conf.projectId ? `${conf.projectId}.firebaseapp.com` : '');

  return {
    apiKey: conf.apiKey,
    projectId: conf.projectId,
    authDomain,
  };
}

export function isFirebaseSdkReady(): boolean {
  if (isTrustedPreviewEnvironment()) return false;
  return isFirebaseConfigured();
}

function ensureFirebaseSdk(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (isTrustedPreviewEnvironment()) {
    throw new Error(
      'Chế độ xem trước AI Studio được cách ly an toàn khỏi Firebase Production.'
    );
  }

  const clientConf = getFirebaseClientConfig();
  if (!clientConf.apiKey || !clientConf.projectId || !clientConf.authDomain) {
    throw new Error(
      'Chưa cấu hình đầy đủ Firebase (API Key / Project ID). Vui lòng kiểm tra biến môi trường.'
    );
  }

  if (!firebaseAppInstance) {
    const existing = getApps().find((a) => a.name === 'th-le-loi-client');
    firebaseAppInstance = existing
      ? getApp('th-le-loi-client')
      : initializeApp(
          {
            apiKey: clientConf.apiKey,
            projectId: clientConf.projectId,
            authDomain: clientConf.authDomain,
          },
          'th-le-loi-client'
        );
  }

  if (!firebaseAuthInstance) {
    firebaseAuthInstance = getAuth(firebaseAppInstance);
    firebaseAuthInstance.languageCode = 'vi';
  }

  if (!firestoreInstance) {
    firestoreInstance = getFirestore(firebaseAppInstance);
  }

  return {
    app: firebaseAppInstance,
    auth: firebaseAuthInstance,
    db: firestoreInstance,
  };
}

export function getFirebaseAuthAndDb(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  return ensureFirebaseSdk();
}

export async function getFirebaseCurrentUserIdToken(forceRefresh = false): Promise<{
  idToken: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
} | null> {
  if (!isFirebaseSdkReady()) return null;
  try {
    const { auth } = ensureFirebaseSdk();
    const user = auth.currentUser;
    if (!user || !user.email) return null;
    const idToken = await user.getIdToken(forceRefresh);
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

export function mapFirebaseAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code || '')
    : '';
  const message = error instanceof Error ? error.message : String(error || '');

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất. Vui lòng thử lại.';
    case 'auth/cancelled-popup-request':
      return 'Yêu cầu đăng nhập Google trước đó đã bị hủy. Vui lòng bấm lại để đăng nhập.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ đăng nhập Google (popup). Hệ thống sẽ chuyển sang đăng nhập trực tiếp.';
    case 'auth/unauthorized-domain':
      return 'Tên miền hiện tại chưa được cấp phép trong Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được bật trong Firebase Console → Authentication → Sign-in method.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng khi xác thực Firebase. Vui lòng kiểm tra kết nối Internet và thử lại.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu chưa chính xác. Vui lòng kiểm tra lại tài khoản phụ huynh do nhà trường cấp.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ nhà trường để được hỗ trợ.';
    case 'auth/too-many-requests':
      return 'Đã thử đăng nhập quá nhiều lần. Vui lòng chờ vài phút rồi thử lại hoặc dùng chức năng Quên mật khẩu.';
    case 'permission-denied':
      return 'Tài khoản không có quyền truy cập dữ liệu này trên Firebase.';
    default:
      return message || 'Đăng nhập không thành công. Vui lòng thử lại.';
  }
}

function getProviderType(user: User): 'google' | 'password' {
  const hasGoogle = user.providerData?.some((p) => p.providerId === 'google.com');
  return hasGoogle ? 'google' : 'password';
}

export function isVerifiedGoogleFirebaseUser(user: User | null | undefined): boolean {
  if (!user || typeof user.uid !== 'string' || !user.uid.trim()) return false;
  if (typeof user.email !== 'string' || !user.email.trim()) return false;
  return Boolean(user.providerData?.some((p) => p.providerId === 'google.com'));
}

export function buildMemberFromFirebaseUser(user: User): MemberUser {
  if (!isVerifiedGoogleFirebaseUser(user) || !user.email) {
    throw new Error(
      'Phiên xác thực Google không hợp lệ. Chỉ tài khoản đã đăng nhập qua Firebase Google Sign-In mới được phép.'
    );
  }
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split('@')[0] || 'Thành viên',
    role: 'Thành viên',
    photoURL: user.photoURL || undefined,
    provider: 'google',
    loginAt: new Date().toLocaleString('vi-VN'),
  };
}

/**
 * Trả về thành viên Google đang được Firebase Authentication xác thực thật sự (null nếu chưa xác thực)
 */
export function getCurrentAuthenticatedGoogleMember(): MemberUser | null {
  if (!isFirebaseSdkReady()) return null;
  try {
    const { auth } = ensureFirebaseSdk();
    const user = auth.currentUser;
    if (!user || !isVerifiedGoogleFirebaseUser(user)) return null;
    return buildMemberFromFirebaseUser(user);
  } catch {
    return null;
  }
}

export function buildParentFromFirebaseUser(user: User, rememberSession = true): ParentUser {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Phụ huynh',
    provider: getProviderType(user),
    rememberSession,
    loginAt: new Date().toLocaleString('vi-VN'),
  };
}

/**
 * Lưu hoặc cập nhật hồ sơ thành viên cơ bản trong /memberProfiles/{uid}
 * (Role luôn cố định là 'member', bị ràng buộc chặt trong Firestore Security Rules)
 */
async function upsertMemberProfile(db: Firestore, user: User): Promise<void> {
  if (!user.email) return;
  try {
    const profileRef = doc(db, 'memberProfiles', user.uid);
    await setDoc(
      profileRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: (user.displayName || user.email.split('@')[0] || 'Thành viên').slice(0, 120),
        ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 500) } : {}),
        provider: getProviderType(user),
        role: 'member',
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    // Không làm gián đoạn phiên đăng nhập nếu Firestore Rules cho memberProfiles chưa được triển khai
    console.warn('Chưa thể đồng bộ hồ sơ thành viên lên memberProfiles:', err);
  }
}

/**
 * Đăng nhập thành viên thật bằng Google (Firebase Authentication GoogleAuthProvider)
 * - Ưu tiên signInWithPopup
 * - Tự động chuyển sang signInWithRedirect nếu trình duyệt chặn popup hoặc không hỗ trợ popup
 * - Duy trì phiên bằng browserLocalPersistence chính thức của Firebase Auth
 */
export async function signInMemberWithGoogle(): Promise<
  { redirected: true; member?: undefined } | { redirected: false; member: MemberUser }
> {
  const { auth, db } = ensureFirebaseSdk();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  await setPersistence(auth, browserLocalPersistence);

  try {
    const credential = await signInWithPopup(auth, provider);
    if (!isVerifiedGoogleFirebaseUser(credential?.user)) {
      await signOut(auth).catch(() => {});
      throw new Error(
        'Firebase Authentication không trả về phiên Google hợp lệ. Vui lòng đăng nhập lại.'
      );
    }
    await upsertMemberProfile(db, credential.user);
    return {
      redirected: false,
      member: buildMemberFromFirebaseUser(credential.user),
    };
  } catch (error: any) {
    const code = error?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return { redirected: true };
    }
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Hoàn tất kết quả đăng nhập Google nếu trình duyệt vừa quay lại từ signInWithRedirect
 */
export async function completeGoogleRedirectIfAny(): Promise<MemberUser | null> {
  if (!isFirebaseSdkReady()) return null;
  try {
    const { auth, db } = ensureFirebaseSdk();
    const result = await getRedirectResult(auth);
    if (result?.user) {
      if (!isVerifiedGoogleFirebaseUser(result.user)) {
        await signOut(auth).catch(() => {});
        return null;
      }
      await upsertMemberProfile(db, result.user);
      return buildMemberFromFirebaseUser(result.user);
    }
    return null;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Đăng nhập phụ huynh bằng Email/Mật khẩu qua Firebase Authentication
 * - Hỗ trợ tùy chọn duy trì phiên trên thiết bị cá nhân (browserLocalPersistence)
 *   hoặc chỉ trong phiên trình duyệt hiện tại (browserSessionPersistence)
 */
export async function signInParentWithEmailPassword(
  email: string,
  password: string,
  rememberSession: boolean
): Promise<ParentUser> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu tài khoản phụ huynh.');
  }

  const { auth } = ensureFirebaseSdk();
  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence
  );

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return buildParentFromFirebaseUser(credential.user, rememberSession);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Gửi email đặt lại mật khẩu cho phụ huynh qua Firebase Authentication
 */
export async function sendParentPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Vui lòng nhập đúng địa chỉ Email tài khoản phụ huynh để đặt lại mật khẩu.');
  }

  const { auth } = ensureFirebaseSdk();
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Đăng xuất người dùng hiện tại khỏi Firebase Authentication
 */
export async function signOutFirebaseUser(): Promise<void> {
  if (!isFirebaseSdkReady()) return;
  const { auth } = ensureFirebaseSdk();
  await signOut(auth);
}

/**
 * Lắng nghe trạng thái phiên Firebase Authentication chính thức (tự động khôi phục khi tải lại trang)
 */
export function subscribeToFirebaseAuth(
  onUserChange: (user: User | null) => void
): () => void {
  if (!isFirebaseSdkReady()) {
    onUserChange(null);
    return () => {};
  }

  try {
    const { auth } = ensureFirebaseSdk();
    return onAuthStateChanged(auth, onUserChange);
  } catch {
    onUserChange(null);
    return () => {};
  }
}

/**
 * Đọc kết quả học tập CHỈ của con em được nhà trường liên kết với tài khoản phụ huynh:
 * 1. Đọc đúng 1 tài liệu /parentLinks/{parentUid}
 * 2. Với mỗi studentId trong danh sách đã liên kết, đọc từng tài liệu /studentResults/{studentId}
 * TUYỆT ĐỐI KHÔNG đọc hay liệt kê toàn bộ danh sách 19 học sinh về trình duyệt.
 */
export async function fetchParentChildrenResults(parentUid: string): Promise<{
  link: ParentLinkRecord | null;
  children: StudentResultRecord[];
  missingIds: string[];
}> {
  if (!parentUid) {
    return { link: null, children: [], missingIds: [] };
  }

  const { auth, db } = ensureFirebaseSdk();
  if (!auth.currentUser || auth.currentUser.uid !== parentUid) {
    return { link: null, children: [], missingIds: [] };
  }
  const linkRef = doc(db, 'parentLinks', parentUid);
  let linkSnap;
  try {
    linkSnap = await getDoc(linkRef);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }

  if (!linkSnap.exists()) {
    return { link: null, children: [], missingIds: [] };
  }

  const linkData = linkSnap.data();
  const studentIds: string[] = Array.isArray(linkData.studentIds)
    ? linkData.studentIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const studentCodes: string[] = Array.isArray(linkData.studentCodes)
    ? linkData.studentCodes.filter((c): c is string => typeof c === 'string')
    : [];

  const link: ParentLinkRecord = {
    parentUid,
    parentEmail: String(linkData.parentEmail || ''),
    parentName: linkData.parentName ? String(linkData.parentName) : undefined,
    studentIds,
    studentCodes,
    updatedAt: String(linkData.updatedAt || ''),
    updatedBy: linkData.updatedBy ? String(linkData.updatedBy) : undefined,
  };

  if (studentIds.length === 0) {
    return { link, children: [], missingIds: [] };
  }

  const children: StudentResultRecord[] = [];
  const missingIds: string[] = [];

  for (const sid of studentIds) {
    try {
      const stSnap = await getDoc(doc(db, 'studentResults', sid));
      if (!stSnap.exists()) {
        missingIds.push(sid);
        continue;
      }
      const d = stSnap.data();
      children.push({
        studentId: stSnap.id,
        studentCode: String(d.studentCode || stSnap.id),
        fullName: String(d.fullName || ''),
        className: String(d.className || ''),
        campus: String(d.campus || 'Trường chính'),
        teacherName: String(d.teacherName || ''),
        academicEvaluation: (d.academicEvaluation || 'Hoàn thành') as StudentResultRecord['academicEvaluation'],
        conductEvaluation: (d.conductEvaluation || 'Đạt') as StudentResultRecord['conductEvaluation'],
        awards: String(d.awards || ''),
        teacherComment: d.teacherComment ? String(d.teacherComment) : undefined,
        academicYear: String(d.academicYear || '2026 - 2027'),
        semester: String(d.semester || 'Cả năm'),
        updatedAt: String(d.updatedAt || ''),
      });
    } catch {
      missingIds.push(sid);
    }
  }

  return { link, children, missingIds };
}

/**
 * Thành viên đã đăng nhập Google gửi đóng góp học liệu dạng liên kết vào hàng chờ duyệt (status: 'pending').
 * Không tự xuất bản công khai — chỉ Quản trị viên mới có quyền duyệt.
 */
export async function submitDocumentForReview(
  input: DocumentSubmissionInput
): Promise<DocumentSubmission> {
  const validation = validateDocumentSubmissionInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { auth, db } = ensureFirebaseSdk();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Vui lòng đăng nhập bằng tài khoản Google trước khi gửi đóng góp học liệu.');
  }

  const nowIso = new Date().toISOString();
  const payload = {
    title: validation.cleaned.title,
    category: validation.cleaned.category,
    categoryLabel: validation.cleaned.categoryLabel,
    description: validation.cleaned.description,
    fileType: validation.cleaned.fileType,
    fileSize: validation.cleaned.fileSize,
    downloadUrl: validation.cleaned.downloadUrl,
    submittedByUid: user.uid,
    submittedByEmail: user.email,
    submittedByName: (user.displayName || user.email.split('@')[0] || 'Thành viên').slice(0, 120),
    status: 'pending' as const,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const docRef = await addDoc(collection(db, 'documentSubmissions'), payload);
    return {
      id: docRef.id,
      ...payload,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Thành viên chỉ đọc danh sách các đề xuất học liệu do chính mình gửi (theo submittedByUid == uid)
 */
export async function fetchMyDocumentSubmissions(uid: string): Promise<DocumentSubmission[]> {
  if (!uid || !isFirebaseSdkReady()) return [];
  try {
    const { db } = ensureFirebaseSdk();
    const q = query(
      collection(db, 'documentSubmissions'),
      where('submittedByUid', '==', uid)
    );
    const snap = await getDocs(q);
    const items: DocumentSubmission[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: String(d.title || ''),
        category: (d.category || 'giao-an') as DocumentSubmission['category'],
        categoryLabel: String(d.categoryLabel || 'Tài Liệu Học Tập'),
        description: String(d.description || ''),
        fileType: String(d.fileType || 'Link trực tuyến'),
        fileSize: String(d.fileSize || 'Liên kết trực tuyến'),
        downloadUrl: String(d.downloadUrl || ''),
        submittedByUid: String(d.submittedByUid || ''),
        submittedByEmail: String(d.submittedByEmail || ''),
        submittedByName: String(d.submittedByName || ''),
        status: (d.status === 'approved' || d.status === 'rejected' ? d.status : 'pending') as DocumentSubmission['status'],
        createdAt: String(d.createdAt || ''),
        updatedAt: String(d.updatedAt || ''),
        reviewNote: d.reviewNote ? String(d.reviewNote) : undefined,
        reviewedBy: d.reviewedBy ? String(d.reviewedBy) : undefined,
        reviewedAt: d.reviewedAt ? String(d.reviewedAt) : undefined,
      };
    });
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  } catch {
    return [];
  }
}
