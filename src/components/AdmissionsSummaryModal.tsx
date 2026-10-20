import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Download,
  FileText,
  Search,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  X,
  Trash2,
  Bell,
} from 'lucide-react';
import { AdmissionRegistration } from '../types';
import {
  getStoredRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
  clearAllRegistrations,
  exportRegistrationsToExcel,
  exportRegistrationsToCsv,
  ADMISSIONS_UPDATE_EVENT,
} from '../admissionsStorage';

interface AdmissionsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const AdmissionsSummaryModal: React.FC<AdmissionsSummaryModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  const [registrations, setRegistrations] = useState<AdmissionRegistration[]>(() =>
    getStoredRegistrations()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted'>('all');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleDeleteReg = async (id: string) => {
    try {
      await deleteRegistration(id);
    setRegistrations((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
    } catch (err) { window.alert("Không xóa được hồ sơ trên Firebase: " + String(err)); }
  };

  const handleClearAllRegs = () => {
    window.alert('Chức năng Xóa tất cả đã khóa để bảo vệ hồ sơ thực.');
    setConfirmClearAll(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    setRegistrations(getStoredRegistrations());
    const handleUpdate = () => {
      setRegistrations(getStoredRegistrations());
    };
    window.addEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingCount = registrations.filter((r) => r.status === 'pending').length;

  const filteredRegistrations = registrations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      r.parentName.toLowerCase().includes(q) ||
      r.childName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.campusChoice.toLowerCase().includes(q) ||
      r.note.toLowerCase().includes(q);

    const matchCampus =
      campusFilter === 'all' || r.campusChoice.toLowerCase().includes(campusFilter.toLowerCase());

    const matchStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchQuery && matchCampus && matchStatus;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  HỆ THỐNG TIẾP NHẬN TUYỂN SINH
                </span>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.2 rounded-full animate-pulse">
                    {pendingCount} hồ sơ mới
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Danh Sách Tổng Hợp Phụ Huynh Đăng Ký
              </h3>
              <p className="text-xs text-emerald-200">
                Tổng số: <strong>{registrations.length} phụ huynh</strong> • Đã liên hệ:{' '}
                <strong>{registrations.length - pendingCount}</strong> • Chờ liên hệ:{' '}
                <strong className="text-amber-300">{pendingCount}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên phụ huynh, học sinh hoặc số điện thoại..."
              className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-medium"
            >
              <option value="all">Tất cả điểm trường</option>
              <option value="Trường chính">Trường chính (Thôn Ea Tút)</option>
              <option value="Phân hiệu 1">Phân hiệu 1</option>
              <option value="Phân hiệu 2">Phân hiệu 2</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chưa liên hệ ({pendingCount})</option>
              <option value="contacted">Đã liên hệ ({registrations.length - pendingCount})</option>
            </select>

            <button
              type="button"
              onClick={() => exportRegistrationsToExcel(filteredRegistrations)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Tải toàn bộ danh sách phụ huynh đăng ký ra file Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Tải Excel Tổng Hợp</span>
            </button>

            <button
              type="button"
              onClick={() => exportRegistrationsToCsv(filteredRegistrations)}
              className="bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Xuất file CSV"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất CSV</span>
            </button>

            {isAdmin && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 bg-red-100 border border-red-300 p-1 rounded-xl animate-in fade-in">
                  <span className="text-[11px] font-bold text-red-900 px-1.5">Xóa sạch danh sách?</span>
                  <button
                    type="button"
                    onClick={handleClearAllRegs}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-all"
                  >
                    Đồng ý
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  disabled={registrations.length === 0}
                  className="bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Xóa toàn bộ danh sách khi đã tuyển sinh xong"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Xóa Tất Cả Danh Sách (Đã Tuyển Sinh Xong)</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Thời Gian</th>
                  <th className="py-2.5 px-3">Phụ Huynh & SĐT</th>
                  <th className="py-2.5 px-3">Học Sinh & Điểm Trường</th>
                  <th className="py-2.5 px-3">Ghi Chú Phụ Huynh</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-500 text-xs">
                      <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">Chưa tìm thấy đăng ký nào phù hợp</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Khi phụ huynh điền form đăng ký tư vấn tuyển sinh, dữ liệu sẽ tự động xuất hiện tại đây.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, idx) => (
                    <tr key={reg.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {reg.submittedAt}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{reg.parentName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={`tel:${reg.phone}`}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                            title="Bấm để gọi điện thoại"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{reg.phone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(reg.phone);
                              setCopiedPhoneId(reg.id);
                              setTimeout(() => setCopiedPhoneId(null), 2000);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                            title="Sao chép số điện thoại"
                          >
                            {copiedPhoneId === reg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {reg.childName}{' '}
                          <span className="font-normal text-slate-500">({reg.birthYear})</span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {reg.campusChoice}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs text-xs">
                        <p className="line-clamp-2" title={reg.note}>
                          {reg.note}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            updateRegistrationStatus(
                              reg.id,
                              reg.status === 'contacted' ? 'pending' : 'contacted'
                            ).catch((err) => window.alert('Không cập nhật được hồ sơ trên Firebase: ' + (err instanceof Error ? err.message : String(err))))
                          }
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            reg.status === 'contacted'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                          }`}
                          title="Bấm để đổi trạng thái"
                        >
                          {reg.status === 'contacted' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Đã liên hệ</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Chưa liên hệ</span>
                            </>
                          )}
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {confirmDeleteId === reg.id ? (
                            <div className="flex items-center justify-end gap-1 animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => handleDeleteReg(reg.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-xs cursor-pointer transition-all"
                                title="Xác nhận xóa hồ sơ này"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-1 rounded text-[10px] cursor-pointer transition-all"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(reg.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="Xóa hồ sơ này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Đang hiển thị <strong>{filteredRegistrations.length}</strong> / <strong>{registrations.length}</strong> hồ sơ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportRegistrationsToExcel(registrations)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Tất Cả ({registrations.length}) Ra Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
