import type {
  ActivityItem,
  DocumentItem,
  GalleryAlbumPhoto,
  GalleryCategory,
  GalleryItem,
  NewsItem,
} from './types';

export type RbacRole = 'super_admin' | 'admin' | 'editor' | 'member' | 'viewer';

export type RbacAction =
  | 'CREATE'
  | 'EDIT_OWN'
  | 'EDIT_ALL'
  | 'DELETE_OWN'
  | 'DELETE_ALL';

export const RBAC_ACTIONS: {
  key: RbacAction;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    key: 'CREATE',
    label: 'Thêm & đăng công khai',
    shortLabel: 'Thêm',
    description: 'Tạo bài mới và xuất bản trực tiếp lên website (hoặc lưu nháp cá nhân).',
  },
  {
    key: 'EDIT_OWN',
    label: 'Sửa bài của mình',
    shortLabel: 'Sửa (của mình)',
    description: 'Chỉnh sửa các nội dung do chính tài khoản mình đăng.',
  },
  {
    key: 'EDIT_ALL',
    label: 'Sửa mọi bài trong mục',
    shortLabel: 'Sửa (tất cả)',
    description: 'Chỉnh sửa bất kỳ nội dung nào thuộc mục/danh mục được cấp.',
  },
  {
    key: 'DELETE_OWN',
    label: 'Xóa bài của mình',
    shortLabel: 'Xóa (của mình)',
    description: 'Xóa các nội dung do chính tài khoản mình đăng.',
  },
  {
    key: 'DELETE_ALL',
    label: 'Xóa mọi bài trong mục',
    shortLabel: 'Xóa (tất cả)',
    description: 'Xóa bất kỳ nội dung nào thuộc mục/danh mục được cấp.',
  },
];

export type MainSectionScopeKey =
  | 'home'
  | 'about'
  | 'staff'
  | 'news'
  | 'activities'
  | 'admissions'
  | 'gallery'
  | 'documents'
  | 'contact'
  | 'other';

export type ActivityCategorySlug =
  | 'day-hoc'
  | 'ngoai-khoa'
  | 'doi-tntp'
  | 'van-nghe'
  | 'the-thao'
  | 'trai-nghiem'
  | 'chuyen-doi-so';

export type ActivitySubScopeKey = `activities:${ActivityCategorySlug}`;

export type RbacScopeKey = MainSectionScopeKey | ActivitySubScopeKey;

export interface RbacScopeDefinition {
  key: RbacScopeKey;
  label: string;
  group: 'main' | 'activity_sub';
  parentKey?: 'activities';
  categorySlug?: ActivityCategorySlug;
  description: string;
}

export const ACTIVITY_SUB_SCOPES: RbacScopeDefinition[] = [
  {
    key: 'activities:day-hoc',
    label: 'Dạy học & STEM',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'day-hoc',
    description: 'Hoạt động chuyên môn, dạy học, STEM và sáng tạo khoa học kỹ thuật.',
  },
  {
    key: 'activities:ngoai-khoa',
    label: 'Ngoại khóa',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'ngoai-khoa',
    description: 'Hoạt động ngoài giờ lên lớp, câu lạc bộ và sinh hoạt ngoại khóa.',
  },
  {
    key: 'activities:doi-tntp',
    label: 'Phong trào Đội',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'doi-tntp',
    description: 'Công tác Đội TNTP Hồ Chí Minh, Sao Nhi đồng, hoạt động thiện nguyện.',
  },
  {
    key: 'activities:van-nghe',
    label: 'Văn nghệ',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'van-nghe',
    description: 'Hội diễn văn nghệ, múa hát sân trường, kỷ niệm các ngày lễ lớn.',
  },
  {
    key: 'activities:the-thao',
    label: 'Thể thao',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'the-thao',
    description: 'Hội khỏe Phù Đổng, thể dục thể thao học đường và trò chơi vận động.',
  },
  {
    key: 'activities:trai-nghiem',
    label: 'Trải nghiệm',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'trai-nghiem',
    description: 'Hoạt động trải nghiệm sáng tạo, kỹ năng sống và tham quan thực tế.',
  },
  {
    key: 'activities:chuyen-doi-so',
    label: 'Chuyển đổi số',
    group: 'activity_sub',
    parentKey: 'activities',
    categorySlug: 'chuyen-doi-so',
    description: 'Ứng dụng công nghệ thông tin, học liệu số và chuyển đổi số giáo dục.',
  },
];

export const MAIN_SECTION_SCOPES: RbacScopeDefinition[] = [
  {
    key: 'home',
    label: 'Trang chủ',
    group: 'main',
    description: 'Các nội dung công khai được phép biên tập trên Trang chủ (khẩu hiệu, mô tả, lịch làm việc).',
  },
  {
    key: 'about',
    label: 'Giới thiệu',
    group: 'main',
    description: 'Thông tin nhà trường, lịch sử hình thành, sứ mệnh, tầm nhìn và cơ sở vật chất.',
  },
  {
    key: 'staff',
    label: 'BGH & Đội ngũ giáo viên',
    group: 'main',
    description: 'Thông tin giới thiệu Ban Giám Hiệu và đội ngũ giáo viên nhà trường.',
  },
  {
    key: 'news',
    label: 'Tin tức & Thông báo',
    group: 'main',
    description: 'Đăng bài viết tin tức, thông báo, tin chuyển đổi số và chia sẻ báo chí.',
  },
  {
    key: 'activities',
    label: 'Hoạt động (Toàn bộ 7 danh mục)',
    group: 'main',
    description: 'Cấp quyền chung cho toàn bộ mục Hoạt động hoặc tích riêng từng danh mục con bên dưới.',
  },
  {
    key: 'admissions',
    label: 'Tuyển sinh',
    group: 'main',
    description: 'Thông tin tuyển sinh công khai (chỉ tiêu, điều kiện, hồ sơ, lịch tuyển sinh).',
  },
  {
    key: 'gallery',
    label: 'Thư viện ảnh',
    group: 'main',
    description: 'Quản lý ảnh đơn và album ảnh sự kiện bằng URL ảnh ImageKit.io.',
  },
  {
    key: 'documents',
    label: 'Kho tài liệu',
    group: 'main',
    description: 'Đăng, sửa, xóa trực tiếp tài liệu PDF, Word, Excel, PowerPoint, Google Drive (HTTPS).',
  },
  {
    key: 'contact',
    label: 'Liên hệ',
    group: 'main',
    description: 'Thông điệp liên hệ và thông tin tiếp nhận công khai của nhà trường.',
  },
  {
    key: 'other',
    label: 'Các mục công khai khác',
    group: 'main',
    description: 'Nội dung bổ sung công khai khác hiện có trên cổng thông tin nhà trường.',
  },
];

export const ALL_RBAC_SCOPES: RbacScopeDefinition[] = [
  ...MAIN_SECTION_SCOPES,
  ...ACTIVITY_SUB_SCOPES,
];

export type ScopeActionPermissions = Partial<Record<RbacAction, boolean>>;
export type PermissionMatrix = Partial<Record<RbacScopeKey, ScopeActionPermissions>>;

export interface UserRoleRecord {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: RbacRole;
  enabled: boolean;
  permissions: PermissionMatrix;
  updatedAt: string;
  updatedBy: string;
  createdAt?: string;
  notes?: string;
}

export interface RoleInvitationRecord {
  id: string;
  email: string;
  displayName?: string;
  role: 'editor' | 'admin';
  permissions: PermissionMatrix;
  status: 'pending' | 'activated' | 'revoked';
  linkedUid?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  notes?: string;
}

export interface RegisteredAccountSummary {
  uid?: string;
  inviteId?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: RbacRole;
  enabled: boolean;
  accountStatus: 'active' | 'disabled' | 'pending_invite';
  permissions: PermissionMatrix;
  lastLoginAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  hasSignedIn: boolean;
  matchingVerifiedProfileUid?: string;
  matchingVerifiedProfileName?: string;
  matchingVerifiedProfilePhoto?: string;
  notes?: string;
}

export type EditorialLogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'role_grant'
  | 'role_update'
  | 'role_revoke';

export interface EditorialLogRecord {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: EditorialLogAction;
  section: string;
  targetCollection?: string;
  targetId: string;
  targetTitle: string;
  summary: string;
  createdAt: string;
  recordedAt?: string;
}

export type PublishStatus = 'published' | 'draft';

export interface FirestoreNewsItem extends NewsItem {
  authorUid: string;
  authorEmail: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastLogId?: string;
}

export interface FirestoreActivityItem extends ActivityItem {
  category: ActivityCategorySlug;
  authorUid: string;
  authorEmail: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastLogId?: string;
}

export interface FirestoreGalleryRecord {
  id: string;
  itemType: 'photo' | 'album';
  title: string;
  category: GalleryCategory;
  date: string;
  imageUrl: string;
  caption: string;
  photos?: GalleryAlbumPhoto[];
  order?: number;
  authorUid: string;
  authorEmail: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastLogId?: string;
}

export interface FirestoreDocumentRecord extends DocumentItem {
  authorUid: string;
  authorEmail: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastLogId?: string;
}

export type EditablePublicSectionId =
  | 'home'
  | 'about'
  | 'staff'
  | 'admissions'
  | 'contact'
  | 'other';

export interface FirestoreSectionContentRecord {
  sectionId: EditablePublicSectionId;
  payload: Record<string, unknown>;
  authorUid: string;
  authorEmail: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastLogId?: string;
}

export interface GranularPublicBundle {
  newsItems: FirestoreNewsItem[];
  activityItems: FirestoreActivityItem[];
  galleryItems: FirestoreGalleryRecord[];
  documentItems: FirestoreDocumentRecord[];
  sectionContents: FirestoreSectionContentRecord[];
}

export function isSuperAdminRecord(roleRecord: UserRoleRecord | null | undefined): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  return roleRecord.role === 'super_admin';
}

export function isAdminOrSuperAdminRecord(roleRecord: UserRoleRecord | null | undefined): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  return roleRecord.role === 'super_admin' || roleRecord.role === 'admin';
}

export function hasDirectScopeAction(
  roleRecord: UserRoleRecord | null | undefined,
  scopeKey: RbacScopeKey,
  action: RbacAction
): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') return true;
  if (roleRecord.role !== 'editor') return false;
  return Boolean(roleRecord.permissions?.[scopeKey]?.[action]);
}

export function canPerformScopeAction(
  roleRecord: UserRoleRecord | null | undefined,
  scopeKey: RbacScopeKey,
  action: RbacAction,
  itemAuthorUid?: string
): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') return true;
  if (roleRecord.role !== 'editor') return false;

  const checkDirect = (act: RbacAction) => Boolean(roleRecord.permissions?.[scopeKey]?.[act]);
  const isActivitySub = scopeKey.startsWith('activities:');
  const checkParent = (act: RbacAction) =>
    isActivitySub && Boolean(roleRecord.permissions?.activities?.[act]);

  if (action === 'CREATE') {
    return checkDirect('CREATE') || checkParent('CREATE');
  }
  if (action === 'EDIT_ALL') {
    return checkDirect('EDIT_ALL') || checkParent('EDIT_ALL');
  }
  if (action === 'EDIT_OWN') {
    if (checkDirect('EDIT_ALL') || checkParent('EDIT_ALL')) return true;
    if (!(checkDirect('EDIT_OWN') || checkParent('EDIT_OWN'))) return false;
    return Boolean(itemAuthorUid && itemAuthorUid === roleRecord.uid);
  }
  if (action === 'DELETE_ALL') {
    return checkDirect('DELETE_ALL') || checkParent('DELETE_ALL');
  }
  if (action === 'DELETE_OWN') {
    if (checkDirect('DELETE_ALL') || checkParent('DELETE_ALL')) return true;
    if (!(checkDirect('DELETE_OWN') || checkParent('DELETE_OWN'))) return false;
    return Boolean(itemAuthorUid && itemAuthorUid === roleRecord.uid);
  }
  return false;
}

export function canEditItem(
  roleRecord: UserRoleRecord | null | undefined,
  scopeKey: RbacScopeKey,
  itemAuthorUid?: string
): boolean {
  return (
    canPerformScopeAction(roleRecord, scopeKey, 'EDIT_ALL', itemAuthorUid) ||
    canPerformScopeAction(roleRecord, scopeKey, 'EDIT_OWN', itemAuthorUid)
  );
}

export function canDeleteItem(
  roleRecord: UserRoleRecord | null | undefined,
  scopeKey: RbacScopeKey,
  itemAuthorUid?: string
): boolean {
  return (
    canPerformScopeAction(roleRecord, scopeKey, 'DELETE_ALL', itemAuthorUid) ||
    canPerformScopeAction(roleRecord, scopeKey, 'DELETE_OWN', itemAuthorUid)
  );
}

export function hasAnyActionInScope(
  roleRecord: UserRoleRecord | null | undefined,
  scopeKey: RbacScopeKey
): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') return true;
  if (roleRecord.role !== 'editor') return false;
  const scopePerms = roleRecord.permissions?.[scopeKey];
  if (!scopePerms) return false;
  return Object.values(scopePerms).some((v) => v === true);
}

export function getAllowedActivityCategories(
  roleRecord: UserRoleRecord | null | undefined,
  requiredAction?: RbacAction
): ActivityCategorySlug[] {
  if (!roleRecord || !roleRecord.enabled) return [];
  const allSlugs = ACTIVITY_SUB_SCOPES.map((s) => s.categorySlug!).filter(Boolean);
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') {
    return allSlugs;
  }
  if (roleRecord.role !== 'editor') return [];

  return allSlugs.filter((slug) => {
    const subKey: ActivitySubScopeKey = `activities:${slug}`;
    if (requiredAction) {
      return (
        hasDirectScopeAction(roleRecord, 'activities', requiredAction) ||
        hasDirectScopeAction(roleRecord, subKey, requiredAction)
      );
    }
    return hasAnyActionInScope(roleRecord, 'activities') || hasAnyActionInScope(roleRecord, subKey);
  });
}

export function getGrantedMainSections(
  roleRecord: UserRoleRecord | null | undefined
): MainSectionScopeKey[] {
  if (!roleRecord || !roleRecord.enabled) return [];
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') {
    return MAIN_SECTION_SCOPES.map((s) => s.key as MainSectionScopeKey);
  }
  if (roleRecord.role !== 'editor') return [];

  const result: MainSectionScopeKey[] = [];
  for (const s of MAIN_SECTION_SCOPES) {
    const key = s.key as MainSectionScopeKey;
    if (key === 'activities') {
      if (getAllowedActivityCategories(roleRecord).length > 0) {
        result.push('activities');
      }
    } else if (hasAnyActionInScope(roleRecord, key)) {
      result.push(key);
    }
  }
  return result;
}

export function hasAnyEditorialPermission(
  roleRecord: UserRoleRecord | null | undefined
): boolean {
  if (!roleRecord || !roleRecord.enabled) return false;
  if (roleRecord.role === 'super_admin' || roleRecord.role === 'admin') return true;
  if (roleRecord.role !== 'editor') return false;
  return getGrantedMainSections(roleRecord).length > 0;
}

export function sanitizePermissionMatrix(raw: unknown): PermissionMatrix {
  if (!raw || typeof raw !== 'object') return {};
  const validScopeKeys = new Set<string>(ALL_RBAC_SCOPES.map((s) => s.key));
  const validActions = new Set<string>(RBAC_ACTIONS.map((a) => a.key));
  const clean: PermissionMatrix = {};

  for (const [scopeKey, actionsObj] of Object.entries(raw as Record<string, unknown>)) {
    if (!validScopeKeys.has(scopeKey) || !actionsObj || typeof actionsObj !== 'object') {
      continue;
    }
    const cleanActions: ScopeActionPermissions = {};
    for (const [actKey, flag] of Object.entries(actionsObj as Record<string, unknown>)) {
      if (validActions.has(actKey) && flag === true) {
        cleanActions[actKey as RbacAction] = true;
      }
    }
    if (Object.keys(cleanActions).length > 0) {
      clean[scopeKey as RbacScopeKey] = cleanActions;
    }
  }
  return clean;
}

export function summarizeGrantedScopes(permissions: PermissionMatrix): string[] {
  const labels: string[] = [];
  for (const def of ALL_RBAC_SCOPES) {
    const acts = permissions?.[def.key];
    if (acts && Object.values(acts).some((v) => v === true)) {
      labels.push(def.group === 'activity_sub' ? `Hoạt động: ${def.label}` : def.label);
    }
  }
  return labels;
}

export function getScopeLabel(scopeKey: string): string {
  const found = ALL_RBAC_SCOPES.find((s) => s.key === scopeKey);
  if (found) {
    return found.group === 'activity_sub' ? `Hoạt động → ${found.label}` : found.label;
  }
  if (scopeKey === 'user_roles') return 'Quản lý tài khoản & phân quyền';
  return scopeKey;
}

export function toGalleryItemFromFirestore(rec: FirestoreGalleryRecord): GalleryItem {
  return {
    id: rec.id,
    title: rec.title,
    category: rec.category,
    imageUrl: rec.imageUrl,
    caption: rec.caption,
    date: rec.date,
    order: rec.order,
    authorUid: rec.authorUid,
    authorEmail: rec.authorEmail,
  };
}
