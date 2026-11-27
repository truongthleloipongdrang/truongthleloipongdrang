import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  UserPlus,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Copy,
  Check,
  Download,
  X,
  UserCheck,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  ALL_RBAC_SCOPES,
  MAIN_SECTION_SCOPES,
  ACTIVITY_SUB_SCOPES,
  RBAC_ACTIONS,
  PermissionMatrix,
  RbacAction,
  RbacRole,
  RbacScopeKey,
  RegisteredAccountSummary,
  RoleInvitationRecord,
  UserRoleRecord,
  summarizeGrantedScopes,
} from '../rbacTypes';
import {
  fetchAllRegisteredAccountsForSuperAdmin,
  saveUserRoleForSuperAdmin,
  revokeUserRoleForSuperAdmin,
  createRoleInvitationForSuperAdmin,
  activateRoleInvitationWithVerifiedUid,
  deleteRoleInvitationForSuperAdmin,
  downloadRbacBackupJson,
} from '../rbacStore';

interface AdminAccountsPermissionsManagerProps {
  isSuperAdmin: boolean;
  isPreviewMode?: boolean;
  actorEmail?: string;
}

type RoleFilter = 'all' | 'super_admin' | 'admin' | 'editor' | 'member' | 'pending_invite';

interface EditorModalState {
  mode: 'edit_uid' | 'new_invite';
  uid?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: RbacRole;
  enabled: boolean;
  permissions: PermissionMatrix;
  notes: string;
  isNewGrant: boolean;
}

const ROLE_LABELS: Record<RbacRole, { label: string; badgeClass: string }> = {
  super_admin: {
    label: 'SUPER ADMIN',
    badgeClass: 'bg-purple-100 text-purple-900 border border-purple-300',
  },
  admin: {
    label: 'Quản trị viên',
    badgeClass: 'bg-amber-100 text-amber-950 border border-amber-300',
  },
  editor: {
    label: 'Giáo viên biên tập',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  },
  viewer: {
    label: 'Xem nội bộ',
    badgeClass: 'bg-sky-100 text-sky-900 border border-sky-200',
  },
  member: {
    label: 'Thành viên Google',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
};

export const AdminAccountsPermissionsManager: React.FC<AdminAccountsPermissionsManagerProps> = ({
  isSuperAdmin,
  isPreviewMode = false,
  actorEmail = 'truongthleloipongdrang@gmail.com',
}) => {
  const [accounts, setAccounts] = useState<RegisteredAccountSummary[]>([]);
  const [invitations, setInvitations] = useState<RoleInvitationRecord[]>([]);
  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmRevokeUid, setConfirmRevokeUid] = useState<string | null>(null);
  const [editorModal, setEditorModal] = useState<EditorModalState | null>(null);
  const [savingModal, setSavingModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSuperAdmin || isPreviewMode) return;
    setLoading(true);
    setFeedback(null);
    try {
      const data = await fetchAllRegisteredAccountsForSuperAdmin();
      setAccounts(data.accounts);
      setInvitations(data.invitations);
      setRoles(data.roles);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể tải danh sách tài khoản và phân quyền từ Firebase.',
      });
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isPreviewMode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (roleFilter === 'pending_invite') {
        if (acc.accountStatus !== 'pending_invite') return false;
      } else if (roleFilter !== 'all') {
        if (acc.accountStatus === 'pending_invite' || acc.role !== roleFilter) return false;
      }

      if (!q) return true;
      return (
        acc.email.toLowerCase().includes(q) ||
        acc.displayName.toLowerCase().includes(q) ||
        (acc.uid || '').toLowerCase().includes(q)
      );
    });
  }, [accounts, searchQuery, roleFilter]);

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="text-base font-extrabold text-red-900">
          Khu vực dành riêng cho SUPER ADMIN
        </h3>
        <p className="text-xs text-red-800 max-w-md mx-auto leading-relaxed">
          Chỉ quản trị viên cấp cao nhất (SUPER ADMIN) được xác thực hợp lệ trên Firebase mới có quyền xem danh sách tài khoản, cấp quyền, chỉnh sửa hoặc thu hồi quyền đăng tin.
        </p>
      </div>
    );
  }

  const handleCopyUid = (uid: string) => {
    navigator.clipboard?.writeText(uid).catch(() => {});
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid((prev) => (prev === uid ? null : prev)), 2000);
  };

  const openEditModalForAccount = (acc: RegisteredAccountSummary) => {
    if (!acc.uid) return;
    setFeedback(null);
    setEditorModal({
      mode: 'edit_uid',
      uid: acc.uid,
      email: acc.email,
      displayName: acc.displayName,
      photoURL: acc.photoURL,
      role: acc.role === 'member' ? 'editor' : acc.role,
      enabled: acc.accountStatus !== 'disabled',
      permissions: JSON.parse(JSON.stringify(acc.permissions || {})),
      notes: acc.notes || '',
      isNewGrant: acc.role === 'member',
    });
  };

  const openNewInviteModal = () => {
    setFeedback(null);
    setEditorModal({
      mode: 'new_invite',
      email: '',
      displayName: '',
      role: 'editor',
      enabled: true,
      permissions: {
        news: { CREATE: true, EDIT_OWN: true, DELETE_OWN: true },
      },
      notes: '',
      isNewGrant: true,
    });
  };

  const toggleMatrixCell = (scopeKey: RbacScopeKey, action: RbacAction) => {
    setEditorModal((prev) => {
      if (!prev) return prev;
      const nextPerms: PermissionMatrix = { ...prev.permissions };
      const currentScope = { ...(nextPerms[scopeKey] || {}) };
      if (currentScope[action]) {
        delete currentScope[action];
      } else {
        currentScope[action] = true;
      }
      if (Object.keys(currentScope).length === 0) {
        delete nextPerms[scopeKey];
      } else {
        nextPerms[scopeKey] = currentScope;
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  const toggleRowBasic = (scopeKey: RbacScopeKey) => {
    setEditorModal((prev) => {
      if (!prev) return prev;
      const nextPerms: PermissionMatrix = { ...prev.permissions };
      const current = nextPerms[scopeKey];
      const hasAny = Boolean(current && Object.values(current).some(Boolean));
      if (hasAny) {
        delete nextPerms[scopeKey];
      } else {
        nextPerms[scopeKey] = { CREATE: true, EDIT_OWN: true, DELETE_OWN: true };
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  const toggleRowAll = (scopeKey: RbacScopeKey) => {
    setEditorModal((prev) => {
      if (!prev) return prev;
      const nextPerms: PermissionMatrix = { ...prev.permissions };
      const current = nextPerms[scopeKey];
      const hasAll = RBAC_ACTIONS.every((a) => Boolean(current?.[a.key]));
      if (hasAll) {
        delete nextPerms[scopeKey];
      } else {
        nextPerms[scopeKey] = {
          CREATE: true,
          EDIT_OWN: true,
          EDIT_ALL: true,
          DELETE_OWN: true,
          DELETE_ALL: true,
        };
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  const applyPreset = (preset: 'news' | 'van_nghe' | 'gallery' | 'documents' | 'clear') => {
    setEditorModal((prev) => {
      if (!prev) return prev;
      if (preset === 'clear') {
        return { ...prev, permissions: {} };
      }
      const nextPerms: PermissionMatrix = { ...prev.permissions };
      if (preset === 'news') {
        nextPerms.news = { CREATE: true, EDIT_OWN: true, DELETE_OWN: true };
      } else if (preset === 'van_nghe') {
        nextPerms['activities:van-nghe'] = { CREATE: true, EDIT_OWN: true, DELETE_OWN: true };
      } else if (preset === 'gallery') {
        nextPerms.gallery = { CREATE: true, EDIT_OWN: true, DELETE_OWN: true };
      } else if (preset === 'documents') {
        nextPerms.documents = { CREATE: true, EDIT_OWN: true, DELETE_OWN: true };
      }
      return { ...prev, role: 'editor', permissions: nextPerms };
    });
  };

  const handleSaveEditorModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorModal || savingModal) return;

    if (isPreviewMode) {
      setFeedback({
        type: 'error',
        text: 'Môi trường xem trước AI Studio được cách ly an toàn, không thay đổi phân quyền trên Firebase Production.',
      });
      return;
    }

    setSavingModal(true);
    setFeedback(null);
    try {
      if (editorModal.mode === 'edit_uid' && editorModal.uid) {
        await saveUserRoleForSuperAdmin({
          uid: editorModal.uid,
          email: editorModal.email,
          displayName: editorModal.displayName,
          photoURL: editorModal.photoURL,
          role: editorModal.role,
          enabled: editorModal.enabled,
          permissions: editorModal.role === 'editor' ? editorModal.permissions : {},
          notes: editorModal.notes,
          isNewGrant: editorModal.isNewGrant,
        });
        setFeedback({
          type: 'success',
          text: `Đã cập nhật phân quyền cho ${editorModal.email} (UID: ${editorModal.uid}). Quyền có hiệu lực ngay trên Firebase Firestore.`,
        });
      } else {
        await createRoleInvitationForSuperAdmin({
          email: editorModal.email,
          displayName: editorModal.displayName,
          role: editorModal.role === 'admin' ? 'admin' : 'editor',
          permissions: editorModal.role === 'editor' ? editorModal.permissions : {},
          notes: editorModal.notes,
        });
        setFeedback({
          type: 'success',
          text: `Đã tạo lời mời chờ xác thực cho ${editorModal.email}. Giáo viên cần đăng nhập Google một lần, sau đó bấm "Kích hoạt & Liên kết UID" để cấp quyền chính thức.`,
        });
      }
      setEditorModal(null);
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể lưu phân quyền lên Firebase.',
      });
    } finally {
      setSavingModal(false);
    }
  };

  const handleRevoke = async (uid: string, email: string, mode: 'disable' | 'delete') => {
    setBusyKey(`revoke-${uid}`);
    setFeedback(null);
    try {
      await revokeUserRoleForSuperAdmin(uid, email, mode);
      setConfirmRevokeUid(null);
      setFeedback({
        type: 'success',
        text:
          mode === 'delete'
            ? `Đã thu hồi hoàn toàn quyền biên tập của ${email} (trở về Thành viên Google mặc định).`
            : `Đã tạm khóa quyền biên tập của ${email}. Tài khoản lập tức không còn quyền ghi Firestore.`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể thu hồi quyền.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleActivateInvite = async (acc: RegisteredAccountSummary) => {
    if (!acc.inviteId || !acc.matchingVerifiedProfileUid) return;
    const inv = invitations.find((i) => i.id === acc.inviteId);
    if (!inv) return;
    setBusyKey(`activate-${acc.inviteId}`);
    setFeedback(null);
    try {
      await activateRoleInvitationWithVerifiedUid(
        inv,
        acc.matchingVerifiedProfileUid,
        acc.matchingVerifiedProfileName || acc.displayName,
        acc.matchingVerifiedProfilePhoto
      );
      setFeedback({
        type: 'success',
        text: `Đã đối chiếu UID ${acc.matchingVerifiedProfileUid} và kích hoạt quyền chính thức cho ${acc.email}!`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể kích hoạt lời mời.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteInvite = async (inviteId: string, email: string) => {
    setBusyKey(`delinv-${inviteId}`);
    setFeedback(null);
    try {
      await deleteRoleInvitationForSuperAdmin(inviteId);
      setFeedback({
        type: 'success',
        text: `Đã hủy lời mời chờ xác thực cho ${email}.`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể xóa lời mời.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const stats = useMemo(() => {
    let editors = 0;
    let admins = 0;
    let pending = 0;
    for (const a of accounts) {
      if (a.accountStatus === 'pending_invite') pending += 1;
      else if (a.role === 'editor' && a.enabled) editors += 1;
      else if ((a.role === 'super_admin' || a.role === 'admin') && a.enabled) admins += 1;
    }
    return { total: accounts.length, editors, admins, pending };
  }, [accounts]);

  const orderedScopesForMatrix = useMemo(() => {
    const out: typeof ALL_RBAC_SCOPES = [];
    for (const main of MAIN_SECTION_SCOPES) {
      out.push(main);
      if (main.key === 'activities') {
        out.push(...ACTIVITY_SUB_SCOPES);
      }
    }
    return out;
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>Quản Lý Tài Khoản Google &amp; Phân Quyền Đăng Tin Theo Mục</span>
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Phân quyền trực tiếp theo Firebase Authentication UID trên Cloud Firestore (<code className="bg-slate-100 px-1 rounded">userRoles/&#123;uid&#125;</code>). Giáo viên được cấp quyền có thể đăng bài trực tiếp tại đúng mục cho phép, không cần hàng chờ duyệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openNewInviteModal}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Mời Gmail Giáo Viên</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadRbacBackupJson({
                roles,
                invitations,
                exportedBy: actorEmail,
              })
            }
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao Lưu Quyền (JSON)</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 cursor-pointer disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải Lại</span>
          </button>
        </div>
      </div>

      {/* Preview Mode Warning */}
      {isPreviewMode && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Chế độ xem trước AI Studio:</strong> Dữ liệu phân quyền thật trên Firebase Production đang được cách ly an toàn. Khi đăng nhập SUPER ADMIN trên website chính thức, danh sách tài khoản Google đã đăng nhập (<code className="bg-white px-1 rounded">memberProfiles</code>), bảng quyền (<code className="bg-white px-1 rounded">userRoles</code>) và lời mời (<code className="bg-white px-1 rounded">roleInvitations</code>) sẽ đồng bộ trực tiếp tại đây.
          </p>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] font-semibold text-slate-500">Tổng tài khoản ghi nhận</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="text-[11px] font-semibold text-emerald-800">Giáo viên biên tập</div>
          <div className="text-xl font-black text-emerald-900 mt-0.5">{stats.editors}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <div className="text-[11px] font-semibold text-purple-800">Quản trị / Super Admin</div>
          <div className="text-xl font-black text-purple-900 mt-0.5">{stats.admins}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-[11px] font-semibold text-amber-800">Lời mời chờ xác thực UID</div>
          <div className="text-xl font-black text-amber-950 mt-0.5">{stats.pending}</div>
        </div>
      </div>

      {/* Honest architectural note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
        <strong className="text-slate-800">Cơ chế xác thực an toàn:</strong> Website chỉ hiển thị các tài khoản Google đã từng đăng nhập vào cổng thông tin (ghi nhận trong <code className="bg-white px-1 rounded">memberProfiles</code>), các tài khoản đã được phân quyền (<code className="bg-white px-1 rounded">userRoles</code>) và lời mời chờ xác thực (<code className="bg-white px-1 rounded">roleInvitations</code>). Khi mời Gmail mới, quyền <strong>chưa kích hoạt</strong> cho tới khi giáo viên đăng nhập Google và SUPER ADMIN đối chiếu liên kết với Firebase Auth UID thật.
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Gmail, họ tên hoặc Firebase Auth UID..."
            className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
        >
          <option value="all">Tất cả vai trò ({accounts.length})</option>
          <option value="editor">Giáo viên biên tập</option>
          <option value="super_admin">SUPER ADMIN</option>
          <option value="admin">Quản trị viên</option>
          <option value="member">Thành viên Google</option>
          <option value="pending_invite">Lời mời chờ xác thực UID</option>
        </select>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="py-10 text-center text-xs text-slate-500">
          Đang tải danh sách tài khoản Google &amp; cấu hình phân quyền từ Firebase...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-700">Chưa có tài khoản nào khớp điều kiện tìm kiếm.</p>
          <p>
            Giáo viên hãy bấm <strong>Đăng nhập thành viên (Gmail)</strong> ở thanh trên cùng, hoặc bạn có thể bấm <strong>Mời Gmail Giáo Viên</strong> để tạo cấu hình quyền trước.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((acc) => {
            const key = acc.uid || acc.inviteId || acc.email;
            const scopeChips = summarizeGrantedScopes(acc.permissions);
            const roleMeta = ROLE_LABELS[acc.role] || ROLE_LABELS.member;

            return (
              <div
                key={key}
                className={`border rounded-2xl p-4 bg-white transition-all space-y-3 ${
                  acc.accountStatus === 'pending_invite'
                    ? 'border-amber-300 bg-amber-50/30'
                    : acc.accountStatus === 'disabled'
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left: Identity */}
                  <div className="flex items-start gap-3 min-w-0">
                    {acc.photoURL ? (
                      <img
                        src={acc.photoURL}
                        alt={acc.displayName}
                        className="w-11 h-11 rounded-full border-2 border-emerald-200 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-900 font-black flex items-center justify-center text-sm shrink-0">
                        {(acc.displayName || acc.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {acc.displayName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleMeta.badgeClass}`}>
                          {roleMeta.label}
                        </span>
                        {acc.accountStatus === 'active' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang hoạt động
                          </span>
                        )}
                        {acc.accountStatus === 'disabled' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            Đã tạm khóa / Thu hồi
                          </span>
                        )}
                        {acc.accountStatus === 'pending_invite' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Chờ xác thực UID
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-emerald-800 break-all">
                        {acc.email}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {acc.uid ? (
                          <button
                            type="button"
                            onClick={() => handleCopyUid(acc.uid!)}
                            className="inline-flex items-center gap-1 font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer"
                            title="Sao chép Firebase Auth UID"
                          >
                            <span>UID: {acc.uid}</span>
                            {copiedUid === acc.uid ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-amber-800 font-medium">
                            {acc.matchingVerifiedProfileUid
                              ? `Đã phát hiện tài khoản Google đã đăng nhập (UID: ${acc.matchingVerifiedProfileUid})`
                              : 'Chưa có UID — giáo viên cần đăng nhập Google lần đầu trước khi kích hoạt'}
                          </span>
                        )}

                        {acc.lastLoginAt && (
                          <span>• Đăng nhập gần nhất: {acc.lastLoginAt}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {acc.accountStatus === 'pending_invite' ? (
                      <>
                        {acc.matchingVerifiedProfileUid && (
                          <button
                            type="button"
                            disabled={busyKey === `activate-${acc.inviteId}`}
                            onClick={() => void handleActivateInvite(acc)}
                            className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Kích hoạt &amp; Liên kết UID</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyKey === `delinv-${acc.inviteId}`}
                          onClick={() => acc.inviteId && void handleDeleteInvite(acc.inviteId, acc.email)}
                          className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hủy lời mời</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModalForAccount(acc)}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{acc.role === 'member' ? 'Cấp quyền' : 'Sửa quyền'}</span>
                        </button>

                        {acc.uid && (acc.role !== 'member' || acc.accountStatus === 'disabled') && (
                          confirmRevokeUid === acc.uid ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-300 rounded-xl px-2 py-1 text-[11px]">
                              <button
                                type="button"
                                disabled={busyKey === `revoke-${acc.uid}`}
                                onClick={() => void handleRevoke(acc.uid!, acc.email, 'disable')}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded-lg cursor-pointer"
                              >
                                Tạm khóa
                              </button>
                              <button
                                type="button"
                                disabled={busyKey === `revoke-${acc.uid}`}
                                onClick={() => void handleRevoke(acc.uid!, acc.email, 'delete')}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded-lg cursor-pointer"
                              >
                                Xóa quyền
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeUid(null)}
                                className="text-slate-600 hover:text-slate-900 font-bold px-1.5 py-0.5 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeUid(acc.uid!)}
                              className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Thu hồi</span>
                            </button>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Granted Sections Chips */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-bold text-slate-600 mr-1">Phạm vi quyền:</span>
                  {acc.role === 'super_admin' && acc.enabled ? (
                    <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                      Toàn quyền hệ thống + Quản lý tài khoản &amp; phân quyền + Nhật ký biên tập
                    </span>
                  ) : acc.role === 'admin' && acc.enabled ? (
                    <span className="bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                      Quản trị toàn bộ nội dung công khai &amp; học sinh (không quản lý bảng phân quyền)
                    </span>
                  ) : scopeChips.length > 0 ? (
                    scopeChips.map((chip) => (
                      <span
                        key={chip}
                        className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold"
                      >
                        {chip}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">
                      Chỉ đọc nội dung công khai &amp; tải tài liệu (không có quyền đăng/sửa/xóa)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PERMISSION MATRIX MODAL */}
      {editorModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-emerald-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {editorModal.mode === 'edit_uid'
                      ? `Phân Quyền Tài Khoản: ${editorModal.displayName}`
                      : 'Tạo Lời Mời Phân Quyền Theo Gmail Giáo Viên'}
                  </h4>
                  <p className="text-[11px] text-emerald-200">
                    {editorModal.mode === 'edit_uid'
                      ? `${editorModal.email} • UID: ${editorModal.uid}`
                      : 'Lời mời chỉ có hiệu lực sau khi giáo viên đăng nhập Google và được SUPER ADMIN liên kết UID'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditorModal(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditorModal} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Identity Fields (for new invite) */}
              {editorModal.mode === 'new_invite' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Địa chỉ Gmail giáo viên *
                    </label>
                    <input
                      type="email"
                      required
                      value={editorModal.email}
                      onChange={(e) =>
                        setEditorModal({ ...editorModal, email: e.target.value })
                      }
                      placeholder="giaovien@gmail.com"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Họ tên / Chức vụ hiển thị
                    </label>
                    <input
                      type="text"
                      value={editorModal.displayName}
                      onChange={(e) =>
                        setEditorModal({ ...editorModal, displayName: e.target.value })
                      }
                      placeholder="Cô Nguyễn Thị A - Tổ trưởng Văn nghệ"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Role & Enabled Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Vai trò tài khoản
                  </label>
                  <select
                    value={editorModal.role}
                    onChange={(e) =>
                      setEditorModal({ ...editorModal, role: e.target.value as RbacRole })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="editor">Giáo viên biên tập (Phân quyền theo mục)</option>
                    <option value="admin">Quản trị viên (Nội dung &amp; Học sinh)</option>
                    {editorModal.mode === 'edit_uid' && (
                      <>
                        <option value="member">Thành viên Google (Chỉ đọc / tải tài liệu)</option>
                        <option value="super_admin">SUPER ADMIN (Toàn quyền + Phân quyền)</option>
                      </>
                    )}
                  </select>
                </div>

                {editorModal.mode === 'edit_uid' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Trạng thái kích hoạt
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditorModal({ ...editorModal, enabled: !editorModal.enabled })
                      }
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        editorModal.enabled
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                          : 'bg-red-50 border-red-300 text-red-800'
                      }`}
                    >
                      {editorModal.enabled ? (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-700" />
                          <span>Đang hoạt động (Cho phép)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-red-600" />
                          <span>Đang tạm khóa (Chặn ngay)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ghi chú phân công (tùy chọn)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={editorModal.notes}
                    onChange={(e) =>
                      setEditorModal({ ...editorModal, notes: e.target.value })
                    }
                    placeholder="VD: Phụ trách mục Văn nghệ & Thư viện ảnh"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Section-Level Matrix (shown for editor role) */}
              {editorModal.role === 'editor' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-black uppercase text-slate-800">
                        Ma Trận Quyền Đăng Tin Theo Từng Mục &amp; Danh Mục Hoạt Động
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Mỗi mục và mỗi hành động được bật/tắt hoàn toàn độc lập. Quyền này được kiểm tra thực sự trên Firestore Security Rules.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset('news')}
                        className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        + Tin tức
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('van_nghe')}
                        className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        + Văn nghệ
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('gallery')}
                        className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        + Thư viện ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('documents')}
                        className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        + Kho tài liệu
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('clear')}
                        className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        Xóa trắng
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2.5 text-left min-w-[230px]">Mục / Danh mục nội dung</th>
                          {RBAC_ACTIONS.map((act) => (
                            <th key={act.key} className="px-2 py-2.5 text-center whitespace-nowrap">
                              <div>{act.shortLabel}</div>
                              <div className="text-[9px] font-mono text-slate-400 font-normal">
                                {act.key}
                              </div>
                            </th>
                          ))}
                          <th className="px-2 py-2.5 text-center whitespace-nowrap">Chọn nhanh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {orderedScopesForMatrix.map((scope) => {
                          const isSub = scope.group === 'activity_sub';
                          const rowPerms = editorModal.permissions[scope.key] || {};
                          const hasAny = Object.values(rowPerms).some(Boolean);
                          const hasAll = RBAC_ACTIONS.every((a) => Boolean(rowPerms[a.key]));

                          return (
                            <tr
                              key={scope.key}
                              className={`${
                                isSub
                                  ? 'bg-emerald-50/25 hover:bg-emerald-50/60'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-2">
                                <div className={`font-bold ${isSub ? 'pl-5 text-emerald-900' : 'text-slate-900'}`}>
                                  {isSub ? `↳ ${scope.label}` : scope.label}
                                </div>
                                <div className={`text-[10px] text-slate-500 ${isSub ? 'pl-5' : ''}`}>
                                  {scope.description}
                                </div>
                              </td>
                              {RBAC_ACTIONS.map((act) => (
                                <td key={act.key} className="px-2 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rowPerms[act.key])}
                                    onChange={() => toggleMatrixCell(scope.key, act.key)}
                                    aria-label={`${scope.label} - ${act.label}`}
                                    className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowBasic(scope.key)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer ${
                                      hasAny
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50'
                                    }`}
                                    title="Bật/tắt quyền cơ bản (Thêm + Sửa/Xóa bài của mình)"
                                  >
                                    {hasAny ? 'Bỏ mục' : 'Cơ bản'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleRowAll(scope.key)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer ${
                                      hasAll
                                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50'
                                    }`}
                                    title="Chọn cả 5 quyền bao gồm Sửa/Xóa mọi bài trong mục"
                                  >
                                    Toàn mục
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                  {editorModal.role === 'super_admin' && (
                    <p>
                      <strong>SUPER ADMIN</strong> có toàn quyền trên tất cả các mục nội dung công khai, quản lý dữ liệu học sinh, quản lý phân quyền tài khoản (<code className="bg-white px-1 rounded">userRoles</code>) và xem nhật ký biên tập bất biến.
                    </p>
                  )}
                  {editorModal.role === 'admin' && (
                    <p>
                      <strong>Quản trị viên</strong> có quyền quản trị nội dung website và dữ liệu học sinh nhưng <strong>không thể</strong> tự nâng cấp thành SUPER ADMIN hoặc thay đổi bảng phân quyền <code className="bg-white px-1 rounded">userRoles</code>.
                    </p>
                  )}
                  {editorModal.role === 'member' && (
                    <p>
                      <strong>Thành viên Google</strong> chỉ có quyền đọc nội dung công khai và tải tài liệu. Mọi thao tác đăng, sửa, xóa trên hệ thống đều bị từ chối.
                    </p>
                  )}
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={savingModal}
                  onClick={() => setEditorModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingModal}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white shadow cursor-pointer disabled:opacity-50"
                >
                  {savingModal
                    ? 'Đang lưu lên Firebase...'
                    : editorModal.mode === 'edit_uid'
                    ? 'Lưu Cấu Hình Phân Quyền'
                    : 'Tạo Lời Mời Chờ Xác Thực UID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
