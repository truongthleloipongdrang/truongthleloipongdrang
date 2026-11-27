import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollText,
  RefreshCcw,
  Search,
  Lock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  EditorialLogAction,
  EditorialLogRecord,
  getScopeLabel,
} from '../rbacTypes';
import { fetchEditorialLogsForSuperAdmin } from '../rbacStore';

interface AdminEditorialLogsPanelProps {
  isSuperAdmin: boolean;
  isPreviewMode?: boolean;
}

const ACTION_BADGE: Record<EditorialLogAction, { label: string; cls: string }> = {
  create: { label: 'Tạo mới', cls: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
  update: { label: 'Chỉnh sửa', cls: 'bg-sky-100 text-sky-900 border border-sky-300' },
  delete: { label: 'Xóa', cls: 'bg-red-100 text-red-900 border border-red-300' },
  role_grant: { label: 'Cấp quyền', cls: 'bg-purple-100 text-purple-900 border border-purple-300' },
  role_update: { label: 'Cập nhật quyền', cls: 'bg-amber-100 text-amber-950 border border-amber-300' },
  role_revoke: { label: 'Thu hồi quyền', cls: 'bg-rose-100 text-rose-900 border border-rose-300' },
};

export const AdminEditorialLogsPanel: React.FC<AdminEditorialLogsPanelProps> = ({
  isSuperAdmin,
  isPreviewMode = false,
}) => {
  const [logs, setLogs] = useState<EditorialLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | EditorialLogAction>('all');

  const loadLogs = useCallback(async () => {
    if (!isSuperAdmin || isPreviewMode) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchEditorialLogsForSuperAdmin();
      setLogs(items);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải nhật ký biên tập từ Firebase.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isPreviewMode]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (!q) return true;
      return (
        log.actorEmail.toLowerCase().includes(q) ||
        log.actorUid.toLowerCase().includes(q) ||
        log.targetTitle.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        getScopeLabel(log.section).toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, actionFilter]);

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="text-base font-extrabold text-red-900">
          Chỉ SUPER ADMIN được xem Nhật Ký Biên Tập
        </h3>
        <p className="text-xs text-red-800 max-w-md mx-auto leading-relaxed">
          Nhật ký biên tập lưu vết mọi thao tác đăng, sửa, xóa nội dung và thay đổi phân quyền để phục vụ đối chiếu quản trị.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-700" />
            <span>Nhật Ký Biên Tập &amp; Thay Đổi Phân Quyền ({filteredLogs.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận tự động ai đăng, sửa, xóa nội dung nào, vào thời điểm nào. Nhật ký bất biến trên Firestore (không cho phép sửa hoặc xóa).
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Tải Lại Nhật Ký</span>
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>
          <strong>Bảo toàn đối chiếu (Immutable Audit Log):</strong> Firestore Security Rules chặn tuyệt đối lệnh <code className="bg-white px-1 rounded">update</code> và <code className="bg-white px-1 rounded">delete</code> trên collection <code className="bg-white px-1 rounded">editorialLogs</code>.
        </span>
      </div>

      {isPreviewMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950">
          Chế độ xem trước AI Studio không truy vấn collection <code className="bg-white px-1 rounded">editorialLogs</code> trên Firebase Production.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo email người thao tác, tiêu đề bài viết, mục hoặc tóm tắt..."
            className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as 'all' | EditorialLogAction)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
        >
          <option value="all">Tất cả thao tác</option>
          <option value="create">Tạo mới</option>
          <option value="update">Chỉnh sửa</option>
          <option value="delete">Xóa</option>
          <option value="role_grant">Cấp quyền</option>
          <option value="role_update">Cập nhật quyền</option>
          <option value="role_revoke">Thu hồi quyền</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Đang tải nhật ký biên tập từ Cloud Firestore...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-xs text-slate-500">
          Chưa có bản ghi nhật ký biên tập nào phù hợp bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5 text-left">Thời gian</th>
                <th className="px-3 py-2.5 text-left">Người thực hiện</th>
                <th className="px-3 py-2.5 text-left">Thao tác</th>
                <th className="px-3 py-2.5 text-left">Mục nội dung</th>
                <th className="px-3 py-2.5 text-left">Đối tượng &amp; Tóm tắt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const badge = ACTION_BADGE[log.action] || ACTION_BADGE.update;
                const formattedTime = (() => {
                  try {
                    const d = new Date(log.createdAt);
                    return Number.isNaN(d.getTime()) ? log.createdAt : d.toLocaleString('vi-VN');
                  } catch {
                    return log.createdAt;
                  }
                })();
                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 align-top">
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {formattedTime}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-emerald-900">{log.actorEmail}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        UID: {log.actorUid}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {getScopeLabel(log.section)}
                    </td>
                    <td className="px-3 py-2.5 space-y-0.5 max-w-md">
                      <div className="font-bold text-slate-900">{log.targetTitle}</div>
                      <div className="text-slate-600 leading-relaxed">{log.summary}</div>
                      <div className="font-mono text-[10px] text-slate-400">ID: {log.targetId}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
