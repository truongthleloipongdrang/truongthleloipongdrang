import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Lock,
  RefreshCcw,
  LogIn,
  LogOut,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  User,
  GraduationCap,
  BookOpen,
  Loader2,
} from 'lucide-react';
import {
  StudentRecord,
  StudentResultRecord,
  EditableCardPayload,
  ParentUser,
  MemberUser,
} from '../types';
import {
  downloadStudentExcelTemplate,
  exportStudentsToExcel,
  parseStudentExcelFile,
  mergeStudentLists,
} from '../studentExcelHelper';
import {
  signInParentWithEmailPassword,
  sendParentPasswordReset,
  isFirebaseSdkReady,
} from '../firebaseAuthStore';
import { isTrustedPreviewEnvironment } from '../authEnvironment';

interface StudentLookupSectionProps {
  students: StudentRecord[];
  isAdmin: boolean;
  isLoading?: boolean;
  loadError?: string | null;
  onReloadStudents?: () => void;
  onEditCard: (payload: EditableCardPayload) => void;
  onOpenAdmin: () => void;
  onSavePrivateStudents?: (newStudents: StudentRecord[]) => Promise<StudentRecord[]>;
  // Parent & Member authentication states
  currentParent?: ParentUser | null;
  currentMember?: MemberUser | null;
  parentChildren?: StudentResultRecord[];
  parentChildrenLoading?: boolean;
  parentChildrenError?: string | null;
  onParentLoginSuccess?: (parent: ParentUser) => void;
  onParentLogout?: () => void;
  onReloadParentChildren?: () => void;
}

export const StudentLookupSection: React.FC<StudentLookupSectionProps> = ({
  students,
  isAdmin,
  isLoading = false,
  loadError = null,
  onReloadStudents,
  onEditCard,
  onOpenAdmin,
  onSavePrivateStudents,
  currentParent = null,
  currentMember = null,
  parentChildren = [],
  parentChildrenLoading = false,
  parentChildrenError = null,
  onParentLoginSuccess,
  onParentLogout,
  onReloadParentChildren,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');

  // Admin Student Excel Import state
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: StudentRecord[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [savingImport, setSavingImport] = useState(false);

  // Parent Login Form state
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [parentLoggingIn, setParentLoggingIn] = useState(false);
  const [parentLoginError, setParentLoginError] = useState<string | null>(null);

  // Parent Forgot Password state
  const [showResetBox, setShowResetBox] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setUploadSuccessMsg(null);
    const result = await parseStudentExcelFile(file);
    if (!result.success) {
      setImportError(result.error || 'Lỗi khi đọc file Excel.');
      e.target.value = '';
      return;
    }

    setImportPreview({
      fileName: file.name,
      students: result.data,
    });
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !onSavePrivateStudents || savingImport) return;
    if (isLoading || Boolean(loadError)) {
      setImportError(
        'Chưa tải được danh sách học sinh hiện có từ Firebase. Vui lòng bấm "Tải Lại Firebase" trước khi nhập Excel để bảo vệ dữ liệu gốc.'
      );
      return;
    }

    const { merged, addedCount, updatedCount } = mergeStudentLists(
      students,
      importPreview.students,
      importMode
    );
    if (merged.length === 0) {
      setImportError('Danh sách học sinh từ file Excel không có bản ghi hợp lệ.');
      return;
    }

    setSavingImport(true);
    setImportError(null);
    setUploadSuccessMsg(null);
    try {
      const verified = await onSavePrivateStudents(merged);
      if (importMode === 'replace') {
        setUploadSuccessMsg(
          `Đã lưu và đối chiếu thành công ${verified.length} học sinh từ file ${importPreview.fileName} lên Firebase!`
        );
      } else {
        const detail = [
          addedCount > 0 ? `thêm mới ${addedCount} em` : '',
          updatedCount > 0 ? `cập nhật ${updatedCount} em đã có (không trùng lặp)` : '',
        ]
          .filter(Boolean)
          .join(', ');
        setUploadSuccessMsg(
          `Đã lưu và đối chiếu thành công lên Firebase (${detail || 'đã đồng bộ'}). Tổng cộng: ${verified.length} học sinh!`
        );
      }
      setImportPreview(null);
      setTimeout(() => setUploadSuccessMsg(null), 6000);
    } catch (err: any) {
      setImportError(
        `Chưa lưu được danh sách học sinh lên Firebase: ${err?.message || 'Lỗi kết nối.'}`
      );
    } finally {
      setSavingImport(false);
    }
  };

  const handleParentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentLoginError(null);

    if (isTrustedPreviewEnvironment()) {
      setParentLoginError(
        'Chế độ xem trước AI Studio được cách ly an toàn khỏi Firebase Production. Đăng nhập phụ huynh hoạt động chính thức trên website nhà trường.'
      );
      return;
    }

    if (!isFirebaseSdkReady()) {
      setParentLoginError(
        'Hệ thống chưa được cấu hình đầy đủ Firebase. Vui lòng liên hệ quản trị viên nhà trường.'
      );
      return;
    }

    setParentLoggingIn(true);
    try {
      const loggedParent = await signInParentWithEmailPassword(
        parentEmail,
        parentPassword,
        rememberDevice
      );
      setParentPassword('');
      if (onParentLoginSuccess) {
        onParentLoginSuccess(loggedParent);
      }
    } catch (err: any) {
      setParentLoginError(
        err?.message || 'Đăng nhập phụ huynh chưa thành công. Vui lòng thử lại.'
      );
    } finally {
      setParentLoggingIn(false);
    }
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    if (isTrustedPreviewEnvironment()) {
      setResetFeedback({
        type: 'error',
        text: 'Chức năng gửi email đặt lại mật khẩu hoạt động trên website chính thức.',
      });
      return;
    }

    const targetEmail = (resetEmail || parentEmail).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setResetFeedback({
        type: 'error',
        text: 'Vui lòng nhập đúng địa chỉ Email tài khoản phụ huynh.',
      });
      return;
    }

    setResetSending(true);
    try {
      await sendParentPasswordReset(targetEmail);
      setResetFeedback({
        type: 'success',
        text: `Đã gửi liên kết đặt lại mật khẩu tới ${targetEmail}. Quý phụ huynh vui lòng kiểm tra hộp thư đến (và mục Thư rác/Spam).`,
      });
    } catch (err: any) {
      setResetFeedback({
        type: 'error',
        text: err?.message || 'Không thể gửi email đặt lại mật khẩu.',
      });
    } finally {
      setResetSending(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2500);
    }
  };

  // Chỉ xử lý danh sách toàn trường khi đã xác thực quyền Quản trị viên
  const visibleStudents = isAdmin ? students : [];
  const classList = Array.from(new Set(visibleStudents.map((s) => s.className))).sort();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const results = visibleStudents.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.studentCode.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q);
    const matchesClass =
      selectedClass === 'all' || s.className === selectedClass;
    const campusVal = s.campus || 'Trường chính';
    const matchesCampus =
      selectedCampus === 'all' ||
      campusVal === selectedCampus ||
      campusVal.startsWith(selectedCampus);
    return matchesQuery && matchesClass && matchesCampus;
  });

  // Phân biệt rõ: Phụ huynh đã đăng nhập (Email/Password hoặc Google đã được Admin liên kết)
  const activeParentAccount = currentParent;
  const isGoogleMemberWithoutLink =
    !isAdmin &&
    Boolean(currentMember) &&
    currentMember?.provider === 'google' &&
    parentChildren.length === 0 &&
    !parentChildrenLoading;

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          SỔ LIÊN LẠC SỐ &amp; TRA CỨU
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          Tra Cứu Thông Tin &amp; Đánh Giá Rèn Luyện Học Sinh
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Tra cứu kết quả học tập và phong trào thi đua theo Thông tư 27/2020/TT-BGDĐT. Cổng tra cứu đảm bảo bảo mật quyền riêng tư tuyệt đối cho từng học sinh.
        </p>
      </div>

      {/* 2. Privacy Policy Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-emerald-950">
            Nguyên tắc bảo vệ dữ liệu học sinh:
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Hệ thống <strong>tuyệt đối không công khai</strong> danh sách học sinh, số CCCD/Định danh cá nhân, ngày sinh hay địa chỉ của các em. Phụ huynh đăng nhập tài khoản riêng do nhà trường cấp chỉ xem được đúng kết quả học tập của con em mình.
          </p>
        </div>
      </div>

      {/* 3. Role-Isolated View: Admin vs Parent vs Unauthenticated */}
      {isAdmin ? (
        <>
          {/* Admin Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Nhập mã học sinh hoặc họ tên
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ví dụ: THLL-101 hoặc Y-Kha..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-900"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Điểm trường / Phân hiệu
                </label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="all">Tất cả điểm trường (Cả 3)</option>
                  <option value="Trường chính">Trường chính</option>
                  <option value="Phân hiệu 1">Phân hiệu 1</option>
                  <option value="Phân hiệu 2">Phân hiệu 2</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Lớp
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="all">Tất cả lớp</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Tìm Kiếm Kết Quả</span>
                </button>
              </div>
            </form>

            {/* Admin Quick import/export tools */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
                <div className="flex items-center space-x-2 text-xs text-emerald-950 font-semibold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Công cụ Quản Trị Học Sinh ({students.length} em):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onReloadStudents && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={onReloadStudents}
                      className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
                      title="Tải lại danh sách học sinh mới nhất từ Firebase"
                    >
                      <RefreshCcw
                        className={`w-3.5 h-3.5 mr-1 text-emerald-700 ${
                          isLoading ? 'animate-spin' : ''
                        }`}
                      />
                      Tải Lại Firebase
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={downloadStudentExcelTemplate}
                    className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                    title="Tải file mẫu Excel (.xlsx) chuẩn để điền danh sách học sinh"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                    Tải Mẫu Excel
                  </button>

                  {onSavePrivateStudents && (
                    <label className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Tải Lên Excel / CSV
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => exportStudentsToExcel(students)}
                    className="inline-flex items-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Xuất toàn bộ danh sách học sinh ra file Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    Xuất Excel
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="inline-flex items-center text-emerald-800 bg-emerald-200/80 hover:bg-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    <span>Mở Bảng Quản Trị</span>
                  </button>
                </div>
              </div>

              {uploadSuccessMsg && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs p-3 rounded-xl flex items-center justify-between">
                  <span className="font-semibold flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
                    {uploadSuccessMsg}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadSuccessMsg(null)}
                    className="font-bold text-emerald-900 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center justify-between">
                  <span>⚠️ {importError}</span>
                  <button
                    type="button"
                    onClick={() => setImportError(null)}
                    className="font-bold text-red-900 ml-2 hover:underline"
                  >
                    ✕ Đóng
                  </button>
                </div>
              )}

              {importPreview && (
                <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-200 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          Đã đọc file Excel:{' '}
                          <span className="text-emerald-800 underline">
                            {importPreview.fileName}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600">
                          Tìm thấy <strong>{importPreview.students.length} học sinh</strong> trong file. Chọn phương thức nạp dữ liệu:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportPreview(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 font-bold px-2 py-1 rounded bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                        importMode === 'append'
                          ? 'bg-emerald-50/60 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lookupImportMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">
                          ➕ Gộp thêm vào danh sách hiện tại (Khuyên dùng - Không trùng lặp)
                        </span>
                        <span className="text-slate-600 block mt-0.5 leading-relaxed">
                          Giữ nguyên {visibleStudents.length} học sinh đang có, tự động cập nhật hồ sơ trùng mã và chỉ thêm học sinh mới. Tổng sau gộp:{' '}
                          <strong>
                            {mergeStudentLists(visibleStudents, importPreview.students, 'append').merged.length}
                          </strong>{' '}
                          học sinh.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                        importMode === 'replace'
                          ? 'bg-red-50/60 border-red-500 shadow-xs ring-1 ring-red-500'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lookupImportMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-red-600"
                      />
                      <div>
                        <span className="font-bold text-red-900 block">
                          🔄 Ghi đè thay thế toàn bộ danh sách
                        </span>
                        <span className="text-slate-600 block mt-0.5 leading-relaxed">
                          Xóa toàn bộ {students.length} học sinh cũ và thay bằng{' '}
                          {importPreview.students.length} học sinh từ file này.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setImportPreview(null)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="button"
                      disabled={savingImport}
                      onClick={handleConfirmImport}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                    >
                      {savingImport ? (
                        <>
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lưu &amp; đối chiếu trên Firebase...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Xác Nhận Lưu {importPreview.students.length} Học Sinh Lên Firebase
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Results Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                {isLoading
                  ? 'ĐANG TẢI DANH SÁCH HỌC SINH TỪ FIREBASE...'
                  : loadError
                  ? 'CHƯA TẢI ĐƯỢC DỮ LIỆU HỌC SINH TỪ FIREBASE'
                  : `KẾT QUẢ TRA CỨU (${results.length} / ${visibleStudents.length} HỌC SINH)`}
              </span>
              <span className="text-xs text-slate-400">Năm học: 2026 - 2027</span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 bg-white border border-emerald-200 rounded-3xl p-6 space-y-2">
                <RefreshCcw className="w-8 h-8 text-emerald-700 mx-auto animate-spin" />
                <h4 className="font-bold text-slate-800 text-base">
                  Đang tải danh sách học sinh từ Firebase...
                </h4>
              </div>
            ) : loadError ? (
              <div className="text-center py-10 bg-red-50 border border-red-200 rounded-3xl p-6 space-y-3">
                <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
                <h4 className="font-bold text-red-900 text-base">
                  Không thể đọc danh sách học sinh từ Firebase
                </h4>
                <p className="text-xs text-red-800 max-w-lg mx-auto leading-relaxed">
                  {loadError}
                </p>
                {onReloadStudents && (
                  <button
                    type="button"
                    onClick={onReloadStudents}
                    className="inline-flex items-center space-x-1.5 bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Thử Tải Lại Từ Firebase</span>
                  </button>
                )}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-6 space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">
                  {visibleStudents.length === 0
                    ? 'Chưa có hồ sơ học sinh nào trong danh sách'
                    : 'Không tìm thấy hồ sơ học sinh phù hợp bộ lọc'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {visibleStudents.length === 0
                    ? 'Quản trị viên có thể tải file Excel hoặc bấm "Tải Lại Firebase" để đồng bộ danh sách học sinh.'
                    : 'Vui lòng kiểm tra lại Mã học sinh, Họ tên hoặc chọn lại đúng Lớp và Điểm trường.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((st) => (
                  <div
                    key={st.id}
                    className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onEditCard({
                          sectionKey: 'students',
                          itemId: st.id,
                          title: st.fullName,
                          subtitle: `Mã HS: ${st.studentCode} - Lớp: ${st.className}`,
                          content: `Đánh giá học tập: ${st.academicEvaluation}. Khen thưởng: ${st.awards}`,
                          extraField1Label: 'GVCN',
                          extraField1Value: st.teacherName,
                          extraField2Label: 'Khen thưởng',
                          extraField2Value: st.awards,
                        })
                      }
                      className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow cursor-pointer"
                    >
                      Sửa thẻ này
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                            {st.studentCode}
                          </span>
                          <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                            {st.campus || 'Trường chính'}
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          Lớp {st.className}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {st.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          GVCN: {st.teacherName}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">
                            Đánh giá học tập:
                          </span>
                          <span className="font-bold text-emerald-800">
                            {st.academicEvaluation}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">
                            Rèn luyện phẩm chất:
                          </span>
                          <span className="font-bold text-emerald-800">
                            {st.conductEvaluation}
                          </span>
                        </div>
                      </div>

                      {st.awards && (
                        <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl font-medium flex items-start space-x-1.5">
                          <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{st.awards}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
                      Trường Tiểu Học Lê Lợi - {st.campus || 'Trường chính'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : activeParentAccount && !isGoogleMemberWithoutLink ? (
        /* PARENT AUTHENTICATED VIEW: ONLY LINKED CHILD(REN) FROM studentResults/{studentId} */
        <div className="space-y-6">
          {/* Parent Session Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    Tài Khoản Phụ Huynh
                  </span>
                  <h2 className="font-extrabold text-base text-white">
                    {activeParentAccount.displayName}
                  </h2>
                </div>
                <p className="text-xs text-emerald-100">
                  Email đăng nhập: <strong>{activeParentAccount.email}</strong>
                </p>
                <div className="flex items-center space-x-2 text-[11px] text-emerald-200">
                  <span className="font-mono bg-emerald-950/60 px-2 py-0.5 rounded">
                    UID: {activeParentAccount.uid}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUid(activeParentAccount.uid)}
                    className="inline-flex items-center space-x-1 text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                    title="Sao chép UID để gửi nhà trường liên kết học sinh"
                  >
                    {copiedUid ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép UID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onReloadParentChildren && (
                <button
                  type="button"
                  disabled={parentChildrenLoading}
                  onClick={onReloadParentChildren}
                  className="inline-flex items-center space-x-1.5 bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <RefreshCcw
                    className={`w-3.5 h-3.5 ${parentChildrenLoading ? 'animate-spin' : ''}`}
                  />
                  <span>Cập Nhật Kết Quả</span>
                </button>
              )}
              {onParentLogout && (
                <button
                  type="button"
                  onClick={onParentLogout}
                  className="inline-flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              )}
            </div>
          </div>

          {/* Child Results Area */}
          {parentChildrenLoading ? (
            <div className="bg-white border border-emerald-200 rounded-3xl p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">
                Đang tải kết quả học tập của con em quý phụ huynh...
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống đang xác thực liên kết phụ huynh – học sinh trên Firebase.
              </p>
            </div>
          ) : parentChildrenError ? (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h3 className="font-bold text-red-900 text-base">
                Không thể tải kết quả học tập
              </h3>
              <p className="text-xs text-red-800 max-w-lg mx-auto leading-relaxed">
                {parentChildrenError}
              </p>
              {onReloadParentChildren && (
                <button
                  type="button"
                  onClick={onReloadParentChildren}
                  className="inline-flex items-center space-x-1.5 bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              )}
            </div>
          ) : parentChildren.length === 0 ? (
            <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-xl mx-auto">
                <h3 className="text-lg font-black text-slate-900">
                  Tài khoản chưa được liên kết với hồ sơ học sinh
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tài khoản <strong>{activeParentAccount.email}</strong> đã đăng nhập thành công, tuy nhiên nhà trường chưa gán mã học sinh cho tài khoản này. Quý phụ huynh vui lòng gửi <strong>Email</strong> hoặc <strong>Mã UID</strong> phía trên cho Giáo viên chủ nhiệm / Quản trị viên nhà trường để liên kết đúng hồ sơ con em mình.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  KẾT QUẢ HỌC TẬP CON EM QUÝ PHỤ HUYNH ({parentChildren.length} HỌC SINH)
                </span>
                <span className="text-xs text-slate-500">
                  Dữ liệu bảo mật riêng tư theo tài khoản
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {parentChildren.map((child) => (
                  <div
                    key={child.studentId}
                    className="bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg">
                          Mã HS: {child.studentCode}
                        </span>
                        <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg">
                          Lớp {child.className}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {child.academicYear} • {child.semester || 'Cả năm'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        {child.fullName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Điểm trường: <strong>{child.campus}</strong> • Giáo viên chủ nhiệm:{' '}
                        <strong>{child.teacherName}</strong>
                      </p>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">
                          Đánh giá kết quả học tập:
                        </span>
                        <span className="font-black text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-200">
                          {child.academicEvaluation}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">
                          Đánh giá rèn luyện phẩm chất:
                        </span>
                        <span className="font-black text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-200">
                          {child.conductEvaluation}
                        </span>
                      </div>
                    </div>

                    {child.awards && (
                      <div className="text-xs text-amber-950 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl font-medium flex items-start space-x-2">
                        <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-amber-900 mb-0.5">
                            Khen thưởng &amp; Ghi nhận:
                          </span>
                          <span>{child.awards}</span>
                        </div>
                      </div>
                    )}

                    {child.teacherComment && (
                      <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Nhận xét của Giáo viên chủ nhiệm:</span>
                        </span>
                        <p className="leading-relaxed">{child.teacherComment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* UNAUTHENTICATED OR GOOGLE-ONLY MEMBER VIEW: PARENT LOGIN FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Parent Login Card */}
          <div className="lg:col-span-7 bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  ĐĂNG NHẬP PHỤ HUYNH
                </h2>
                <p className="text-xs text-slate-600">
                  Đăng nhập bằng tài khoản Phụ huynh do nhà trường cấp để xem kết quả học tập của con em mình.
                </p>
              </div>
            </div>

            {isGoogleMemberWithoutLink && currentMember && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Bạn đang đăng nhập bằng tài khoản Thành viên Google ({currentMember.email})
                  </span>
                </p>
                <p className="leading-relaxed text-amber-900">
                  Tài khoản Google Thành viên chỉ dùng để tải và đóng góp tài liệu trong Kho Học Liệu, <strong>không</strong> xem được kết quả học tập học sinh trừ khi được nhà trường liên kết. Quý phụ huynh vui lòng đăng nhập bằng tài khoản Phụ huynh (Email/Mật khẩu) bên dưới.
                </p>
              </div>
            )}

            {parentLoginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{parentLoginError}</span>
              </div>
            )}

            <form onSubmit={handleParentLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email / Tài khoản phụ huynh *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="phuhuynh.hs@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tài khoản phụ huynh"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="inline-flex items-center space-x-2 text-slate-700 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Duy trì đăng nhập trên thiết bị cá nhân</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetBox((prev) => !prev);
                    setResetEmail(parentEmail);
                    setResetFeedback(null);
                  }}
                  className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={parentLoggingIn}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {parentLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực tài khoản phụ huynh...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng Nhập Xem Kết Quả Học Tập</span>
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password Inline Form */}
            {showResetBox && (
              <form
                onSubmit={handleSendPasswordReset}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150"
              >
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    Đặt lại mật khẩu tài khoản phụ huynh
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Nhập địa chỉ email đã đăng ký, hệ thống Firebase sẽ gửi liên kết đặt lại mật khẩu an toàn vào hộp thư của quý phụ huynh.
                  </p>
                </div>

                {resetFeedback && (
                  <div
                    className={`text-xs p-2.5 rounded-xl border font-medium ${
                      resetFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {resetFeedback.text}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Nhập email tài khoản phụ huynh..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={resetSending}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {resetSending ? 'Đang gửi...' : 'Gửi Email Đặt Lại'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Instructions & Admin Entry */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>Hướng Dẫn Tra Cứu An Toàn</span>
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li>
                  • <strong>Bước 1:</strong> Nhận tài khoản Email &amp; mật khẩu phụ huynh từ Giáo viên chủ nhiệm hoặc văn phòng nhà trường.
                </li>
                <li>
                  • <strong>Bước 2:</strong> Đăng nhập tại khung <strong>ĐĂNG NHẬP PHỤ HUYNH</strong> bên cạnh. Nếu dùng máy tính cá nhân, có thể chọn <em>&quot;Duy trì đăng nhập&quot;</em> để không phải đăng nhập lại sau khi tải lại trang.
                </li>
                <li>
                  • <strong>Bước 3:</strong> Hệ thống chỉ tải duy nhất kết quả học tập, rèn luyện và nhận xét của con em đã được liên kết với tài khoản phụ huynh.
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <p className="text-xs font-bold text-slate-700">
                Dành cho Ban Giám Hiệu / Quản trị nhà trường:
              </p>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Đăng Nhập Tài Khoản Quản Trị</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
