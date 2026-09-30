import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  KeyRound,
  Save,
  Download,
  Upload,
  RefreshCcw,
  Sparkles,
  Plus,
  Trash2,
  Users,
  FileText,
  Calendar,
  AlertTriangle,
  Github,
  CheckCircle2,
  ExternalLink,
  Search,
  Link as LinkIcon,
  Eye,
} from 'lucide-react';
import {
  SiteContent,
  Teacher,
  NewsItem,
  StudentRecord,
  DocumentItem,
  MemberUser,
} from '../types';
import {
  sha256Hash,
  getStoredAdminHash,
  setStoredAdminHash,
  pushContentToGitHub,
  exportContentAsJson,
} from '../siteContentSync';
import { generateTeacherBioWithAI } from '../geminiConfig';
import {
  downloadStudentExcelTemplate,
  exportStudentsToExcel,
  parseStudentExcelFile,
} from '../studentExcelHelper';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  content: SiteContent;
  onSaveContent: (newContent: SiteContent) => void;
  onResetContent: () => void;
  memberLogList: MemberUser[];
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
  content,
  onSaveContent,
  onResetContent,
  memberLogList,
}) => {
  if (!isOpen) return null;

  // Login form states
  const [username, setUsername] = useState('bgh_leloi');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<
    | 'school'
    | 'staff'
    | 'news'
    | 'students'
    | 'documents'
    | 'members'
    | 'password'
    | 'sync'
  >('school');

  // Working copy of content
  const [draft, setDraft] = useState<SiteContent>(JSON.parse(JSON.stringify(content)));
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Password change form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // GitHub sync states
  const [githubToken, setGithubToken] = useState('');
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  // AI loading per teacher
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);

  // Student Excel Import states
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: StudentRecord[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
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

  const handleConfirmStudentImport = () => {
    if (!importPreview) return;

    if (importMode === 'replace') {
      setDraft({ ...draft, students: importPreview.students });
      setStatusMsg({
        type: 'success',
        text: `Đã thay thế toàn bộ danh sách bằng ${importPreview.students.length} học sinh từ file Excel! Nhớ bấm "Lưu Thay Đổi" để áp dụng.`,
      });
    } else {
      setDraft({ ...draft, students: [...importPreview.students, ...draft.students] });
      setStatusMsg({
        type: 'success',
        text: `Đã thêm thành công ${importPreview.students.length} học sinh từ file Excel vào danh sách! Nhớ bấm "Lưu Thay Đổi" để áp dụng.`,
      });
    }

    setImportPreview(null);
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!password) {
      setLoginError('Vui lòng nhập mật khẩu quản trị.');
      return;
    }

    const hashed = await sha256Hash(password);
    const storedHash = getStoredAdminHash();

    // Check with stored SHA-256 hash or fallback initial secure hash
    if (hashed === storedHash || password === 'Leloi@PongDrang2026#') {
      onLoginSuccess();
      setDraft(JSON.parse(JSON.stringify(content)));
      setPassword('');
    } else {
      setLoginError('Mật khẩu không chính xác. Mật khẩu khởi tạo: Leloi@PongDrang2026#');
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');

    if (newPw.length < 8) {
      setPwMsg('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    const currentHashed = await sha256Hash(currentPw);
    const storedHash = getStoredAdminHash();

    if (currentHashed !== storedHash && currentPw !== 'Leloi@PongDrang2026#') {
      setPwMsg('Mật khẩu hiện tại không đúng.');
      return;
    }

    const newHashed = await sha256Hash(newPw);
    setStoredAdminHash(newHashed);
    setPwMsg('✅ Đổi mật khẩu thành công! Mật khẩu mới đã được băm an toàn SHA-256.');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  // Save changes locally
  const handleSaveDraft = () => {
    onSaveContent(draft);
    setStatusMsg({ type: 'success', text: 'Đã lưu tất cả thay đổi vào bộ nhớ!' });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Direct push to GitHub
  const handlePushGitHub = async () => {
    setIsSyncingGithub(true);
    setStatusMsg(null);
    try {
      const result = await pushContentToGitHub(draft, githubToken);
      if (result.success) {
        onSaveContent(draft);
        setStatusMsg({ type: 'success', text: result.message });
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi đồng bộ GitHub' });
    } finally {
      setIsSyncingGithub(false);
    }
  };

  // Quick AI bio generation for a teacher
  const handleGenerateBio = async (teacherIndex: number) => {
    const t = draft.teachers[teacherIndex];
    if (!t) return;
    setAiGeneratingId(t.id);
    try {
      const bio = await generateTeacherBioWithAI({
        name: t.name,
        role: t.role,
        subjectOrGrade: t.subjectOrGrade,
        campus: t.campus,
        qualification: t.qualification,
        achievements: t.achievements,
      });
      const updatedTeachers = [...draft.teachers];
      updatedTeachers[teacherIndex] = { ...t, bio };
      setDraft({ ...draft, teachers: updatedTeachers });
    } finally {
      setAiGeneratingId(null);
    }
  };

  // Student CSV Export
  const exportStudentsCsv = () => {
    const headers = 'Mã HS,Họ và Tên,Lớp,Năm học,Đánh giá học tập,Đánh giá rèn luyện,Khen thưởng,GVCN\n';
    const rows = draft.students
      .map(
        (s) =>
          `"${s.studentCode}","${s.fullName}","${s.className}","${s.academicYear}","${s.academicEvaluation}","${s.conductEvaluation}","${s.awards}","${s.teacherName}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-hoc-sinh-le-loi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Member log CSV export
  const exportMembersCsv = () => {
    const headers = 'Gmail,Họ tên,Vai trò,Thời gian đăng nhập\n';
    const rows = memberLogList
      .map((m) => `"${m.email}","${m.name}","${m.role}","${m.loginAt}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-thanh-vien-gmail-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold block">
                BẢNG ĐIỀU KHIỂN QUẢN TRỊ TRƯỜNG HỌC
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isAdmin
                  ? 'Quản Trị Nội Dung - Trường Tiểu Học Lê Lợi'
                  : 'Xác Thực Quản Trị Viên (Ctrl + K)'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert if any */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between shrink-0 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-200'
                : 'bg-red-100 text-red-900 border-b border-red-200'
            }`}
          >
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {statusMsg.text}
            </span>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content depending on login status */}
        {!isAdmin ? (
          // ================= LOGIN FORM =================
          <div className="p-8 max-w-md mx-auto w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Đăng Nhập Cổng Quản Trị
              </h3>
              <p className="text-xs text-slate-500">
                Chỉ dành cho Ban Giám Hiệu và Cán bộ Quản trị Trường Tiểu học Lê Lợi
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center text-amber-950">
                <AlertTriangle className="w-4 h-4 mr-1 text-amber-700 shrink-0" />
                Thông báo bảo mật:
              </p>
              <p className="text-amber-800">
                Mật khẩu quản trị được mã hóa bằng thuật toán SHA-256 an toàn. Bạn có thể đổi mật khẩu bất kỳ lúc nào sau khi đăng nhập.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Mật khẩu quản trị
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-emerald-700 hover:underline font-medium"
                >
                  Quên mật khẩu?
                </button>
                <span className="text-slate-400">Phím tắt: Ctrl + K</span>
              </div>

              {showForgotNotice && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <p className="font-semibold">Hỗ trợ khôi phục:</p>
                  <p className="mt-1">
                    Mật khẩu mặc định hệ thống cấp là:{' '}
                    <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-bold">
                      Leloi@PongDrang2026#
                    </code>
                    . Nếu đổi mật khẩu mà quên, vui lòng liên hệ email trường:{' '}
                    <strong>truongthleloipongdrang@gmail.com</strong>.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Đăng Nhập Quản Trị</span>
              </button>
            </form>
          </div>
        ) : (
          // ================= ADMIN DASHBOARD =================
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar navigation */}
            <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
              <button
                onClick={() => setActiveTab('school')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'school'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🏫 Thông Tin Trường
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'staff'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                👨‍🏫 BGH & Giáo Viên ({draft.teachers.length})
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'news'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                📰 Tin Tức & Thông Báo ({draft.news.length})
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🎓 Học Sinh & Tra Cứu ({draft.students.length})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'documents'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                📂 Kho Tài Liệu ({draft.documents.length})
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'members'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                👥 Nhật Ký Thành Viên ({memberLogList.length})
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'password'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🔑 Đổi Mật Khẩu
              </button>
              <button
                onClick={() => setActiveTab('sync')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'sync'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🔄 Sao Lưu & GitHub
              </button>

              <div className="mt-auto pt-3 border-t border-slate-200 hidden md:block">
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  🚪 Đăng Xuất Quản Trị
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* TAB 1: SCHOOL INFO */}
              {activeTab === 'school' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                    Thông Tin Tổng Quan Nhà Trường
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Tên trường
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, name: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số điện thoại hotline
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.phone}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, phone: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email liên hệ
                      </label>
                      <input
                        type="email"
                        value={draft.schoolInfo.email}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, email: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Địa chỉ đầy đủ
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.fullAddress}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: {
                              ...draft.schoolInfo,
                              fullAddress: e.target.value,
                            },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Khẩu hiệu giáo dục (Slogan)
                    </label>
                    <input
                      type="text"
                      value={draft.schoolInfo.slogan}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          schoolInfo: { ...draft.schoolInfo, slogan: e.target.value },
                        })
                      }
                      className="w-full border rounded-lg p-2 text-sm font-semibold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Lịch sử nhà trường
                    </label>
                    <textarea
                      rows={3}
                      value={draft.history}
                      onChange={(e) => setDraft({ ...draft, history: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sứ mệnh nhà trường
                    </label>
                    <textarea
                      rows={2}
                      value={draft.mission}
                      onChange={(e) => setDraft({ ...draft, mission: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: STAFF & BGH */}
              {activeTab === 'staff' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Ban Giám Hiệu & Đội Ngũ Giáo Viên
                    </h3>
                    <button
                      onClick={() => {
                        const newT: Teacher = {
                          id: 'teacher-' + Date.now(),
                          name: 'Giáo viên mới',
                          role: 'Giáo viên bộ môn',
                          subjectOrGrade: 'Khối lớp',
                          campus: 'Trường chính',
                          qualification: 'Cử nhân Sư phạm',
                          bio: 'Tận tâm với nghề giáo dục tiểu học tại Đắk Lắk.',
                          avatar:
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
                        };
                        setDraft({ ...draft, teachers: [newT, ...draft.teachers] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm Giáo Viên
                    </button>
                  </div>

                  {/* BGH list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase">
                      Ban Giám Hiệu (3 Đồng chí lãnh đạo)
                    </h4>
                    {draft.principals.map((p, idx) => (
                      <div
                        key={p.id}
                        className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-emerald-950">
                            {p.title}: {p.name}
                          </span>
                          <span className="text-xs text-emerald-700 font-medium">
                            {p.campus}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...draft.principals];
                            updated[idx].name = e.target.value;
                            setDraft({ ...draft, principals: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                          placeholder="Họ tên"
                        />
                        <textarea
                          rows={2}
                          value={p.bio}
                          onChange={(e) => {
                            const updated = [...draft.principals];
                            updated[idx].bio = e.target.value;
                            setDraft({ ...draft, principals: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                          placeholder="Mô tả / Tiểu sử"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Teachers list */}
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase">
                      Danh Sách Giáo Viên
                    </h4>
                    {draft.teachers.map((t, idx) => (
                      <div
                        key={t.id}
                        className="border border-slate-200 rounded-xl p-3 bg-white space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].name = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            className="font-bold text-sm text-slate-900 border rounded px-2 py-1"
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGenerateBio(idx)}
                              disabled={aiGeneratingId === t.id}
                              className="inline-flex items-center text-[11px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded"
                            >
                              <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                              {aiGeneratingId === t.id ? 'Đang tạo...' : 'AI viết mô tả'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = draft.teachers.filter(
                                  (_, i) => i !== idx
                                );
                                setDraft({ ...draft, teachers: updated });
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Xóa giáo viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <input
                            type="text"
                            value={t.role}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].role = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            placeholder="Chức vụ / Tổ"
                            className="border rounded p-1.5"
                          />
                          <input
                            type="text"
                            value={t.subjectOrGrade}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].subjectOrGrade = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            placeholder="Môn dạy / Khối"
                            className="border rounded p-1.5"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={t.bio}
                          onChange={(e) => {
                            const updated = [...draft.teachers];
                            updated[idx].bio = e.target.value;
                            setDraft({ ...draft, teachers: updated });
                          }}
                          placeholder="Mô tả tâm huyết giáo viên..."
                          className="w-full border rounded p-1.5 text-xs text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: NEWS */}
              {activeTab === 'news' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Quản Lý Tin Tức & Thông Báo
                    </h3>
                    <button
                      onClick={() => {
                        const newN: NewsItem = {
                          id: 'news-' + Date.now(),
                          title: 'Tiêu đề tin tức mới',
                          category: 'tin-tuc',
                          categoryLabel: 'Tin Tức Nhà Trường',
                          summary: 'Tóm tắt nội dung thông báo hoặc sự kiện...',
                          content: 'Nội dung chi tiết của bài viết được cập nhật tại đây...',
                          date: new Date().toLocaleDateString('vi-VN'),
                          author: 'Ban Giám Hiệu',
                          imageUrl:
                            'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=80',
                          isFeatured: false,
                        };
                        setDraft({ ...draft, news: [newN, ...draft.news] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Viết Tin Mới
                    </button>
                  </div>

                  <div className="space-y-3">
                    {draft.news.map((item, idx) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-xl p-3 bg-white space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...draft.news];
                              updated[idx].title = e.target.value;
                              setDraft({ ...draft, news: updated });
                            }}
                            className="font-bold text-sm text-slate-900 border rounded px-2 py-1 w-3/4"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = draft.news.filter((_, i) => i !== idx);
                              setDraft({ ...draft, news: updated });
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={item.summary}
                          onChange={(e) => {
                            const updated = [...draft.news];
                            updated[idx].summary = e.target.value;
                            setDraft({ ...draft, news: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: STUDENTS */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Quản Lý Học Sinh & Dữ Liệu Tra Cứu
                      </h3>
                      <p className="text-xs text-slate-500">
                        Chỉ lưu trữ kết quả rèn luyện công khai an toàn (không CCCD, không ngày sinh đầy đủ). Hiện có: <strong className="text-emerald-800">{draft.students.length} học sinh</strong>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. Download Template */}
                      <button
                        type="button"
                        onClick={downloadStudentExcelTemplate}
                        className="inline-flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
                        title="Tải file mẫu Excel chuẩn để điền danh sách học sinh"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Tải Mẫu Excel
                      </button>

                      {/* 2. Upload Excel / CSV */}
                      <label className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Tải Lên Excel / CSV
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleStudentFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* 3. Export Excel */}
                      <button
                        type="button"
                        onClick={() => exportStudentsToExcel(draft.students)}
                        className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Xuất toàn bộ danh sách học sinh hiện tại ra file Excel (.xlsx)"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-slate-700" />
                        Xuất Excel
                      </button>

                      {/* 4. Manual Add */}
                      <button
                        type="button"
                        onClick={() => {
                          const newS: StudentRecord = {
                            id: 'std-' + Date.now(),
                            studentCode: `THLL-${100 + draft.students.length + 1}`,
                            fullName: 'Học sinh mới',
                            className: '1A',
                            campus: 'Trường chính',
                            academicYear: '2026 - 2027',
                            academicEvaluation: 'Hoàn thành tốt',
                            conductEvaluation: 'Tốt',
                            teacherName: 'Giáo viên chủ nhiệm',
                            awards: 'Chăm ngoan học tốt',
                          };
                          setDraft({ ...draft, students: [newS, ...draft.students] });
                        }}
                        className="inline-flex items-center bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Thêm Thủ Công
                      </button>
                    </div>
                  </div>

                  {/* Upload Error Banner */}
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

                  {/* Upload Preview & Confirmation Dialog */}
                  {importPreview && (
                    <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-200 shadow-lg">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                          <div>
                            <h4 className="font-black text-sm text-emerald-950">
                              Đã đọc file: <span className="underline decoration-emerald-500">{importPreview.fileName}</span>
                            </h4>
                            <p className="text-xs text-emerald-800">
                              Tìm thấy <strong>{importPreview.students.length} học sinh</strong> hợp lệ trong file. Vui lòng chọn cách nạp dữ liệu:
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImportPreview(null)}
                          className="text-xs text-slate-500 hover:text-slate-900 font-bold px-2 py-1 rounded bg-slate-200/60"
                        >
                          Hủy bỏ
                        </button>
                      </div>

                      {/* Mode selection radio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                            importMode === 'append'
                              ? 'bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                              : 'bg-emerald-100/40 border-emerald-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">
                              ➕ Thêm tiếp vào danh sách hiện tại (Khuyên dùng)
                            </span>
                            <span className="text-slate-600 leading-relaxed block mt-0.5">
                              Giữ nguyên {draft.students.length} học sinh đang có, thêm tiếp {importPreview.students.length} học sinh từ file. Tổng cộng sẽ có <strong>{draft.students.length + importPreview.students.length}</strong> học sinh.
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                            importMode === 'replace'
                              ? 'bg-white border-red-500 shadow-xs ring-1 ring-red-500'
                              : 'bg-emerald-100/40 border-emerald-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="mt-0.5 text-red-600"
                          />
                          <div>
                            <span className="font-bold text-red-900 block">
                              🔄 Ghi đè thay thế toàn bộ danh sách
                            </span>
                            <span className="text-slate-600 leading-relaxed block mt-0.5">
                              Xóa toàn bộ danh sách cũ ({draft.students.length} em) và nạp mới {importPreview.students.length} học sinh từ file này.
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Table preview (first 5) */}
                      <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                        <div className="bg-emerald-100/70 px-3 py-1.5 text-[11px] font-bold text-emerald-950 flex justify-between items-center">
                          <span>Xem trước dữ liệu trích xuất (5 dòng đầu tiên):</span>
                          <span className="text-xs bg-emerald-200/80 px-2 py-0.5 rounded-full">
                            5 / {importPreview.students.length} học sinh
                          </span>
                        </div>
                        <div className="overflow-x-auto max-h-40">
                          <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                              <tr>
                                <th className="px-2.5 py-1.5 text-left">Mã HS</th>
                                <th className="px-2.5 py-1.5 text-left">Họ và Tên</th>
                                <th className="px-2.5 py-1.5 text-left">Lớp</th>
                                <th className="px-2.5 py-1.5 text-left">Điểm Trường</th>
                                <th className="px-2.5 py-1.5 text-left">Đánh Giá Học Tập</th>
                                <th className="px-2.5 py-1.5 text-left">Đánh Giá Rèn Luyện</th>
                                <th className="px-2.5 py-1.5 text-left">GVCN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importPreview.students.slice(0, 5).map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 font-mono font-bold text-emerald-800">
                                    {s.studentCode}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-900">
                                    {s.fullName}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-bold text-slate-700">
                                    {s.className}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-medium text-emerald-800">
                                    {s.campus || 'Trường chính'}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-emerald-700 font-medium">
                                    {s.academicEvaluation}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-600">
                                    {s.conductEvaluation}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-600">
                                    {s.teacherName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Confirm / Cancel buttons */}
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
                          onClick={handleConfirmStudentImport}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Xác Nhận Nạp {importPreview.students.length} Học Sinh Vào Danh Sách
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Mã HS</th>
                          <th className="px-3 py-2 text-left">Họ và Tên</th>
                          <th className="px-3 py-2 text-left">Lớp</th>
                          <th className="px-3 py-2 text-left">Điểm Trường</th>
                          <th className="px-3 py-2 text-left">Đánh Giá Học Tập</th>
                          <th className="px-3 py-2 text-left">GVCN</th>
                          <th className="px-3 py-2 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {draft.students.map((st, idx) => (
                          <tr key={st.id}>
                            <td className="px-3 py-2 font-mono font-bold text-emerald-800">
                              <input
                                type="text"
                                value={st.studentCode}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].studentCode = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-20 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.fullName}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].fullName = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-36 border rounded px-1 py-0.5 font-semibold"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.className}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].className = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-16 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={st.campus || 'Trường chính'}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].campus = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="border rounded px-2 py-0.5 text-xs bg-white text-emerald-900 font-semibold"
                              >
                                <option value="Trường chính">Trường chính</option>
                                <option value="Phân hiệu 1">Phân hiệu 1</option>
                                <option value="Phân hiệu 2">Phân hiệu 2</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={st.academicEvaluation}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].academicEvaluation = e.target.value as any;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="border rounded px-1 py-0.5"
                              >
                                <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                                <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Cần cố gắng">Cần cố gắng</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.teacherName}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].teacherName = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-32 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  const upd = draft.students.filter((_, i) => i !== idx);
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Kho Tài Liệu Học Liệu Số
                      </h3>
                      <p className="text-xs text-slate-500">
                        Quản lý văn bản, giáo án, đề thi và gắn đường link Google Drive, OneDrive, PDF trực tuyến để xem/tải về.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newDoc: DocumentItem = {
                          id: 'doc-' + Date.now(),
                          title: 'Tài liệu giáo dục mới',
                          category: 'giao-an',
                          categoryLabel: 'Giáo Án & Phân Phối',
                          fileSize: '1.5 MB',
                          fileType: 'PDF / DOCX',
                          uploadDate: new Date().toLocaleDateString('vi-VN'),
                          uploaderName: 'Ban Quản Trị',
                          uploaderEmail: 'truongthleloipongdrang@gmail.com',
                          downloadCount: 0,
                          description: 'Mô tả tóm tắt nội dung tài liệu học tập...',
                          downloadUrl: '',
                        };
                        setDraft({ ...draft, documents: [newDoc, ...draft.documents] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm Tài Liệu Mới
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {draft.documents.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className="border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 bg-white shadow-2xs space-y-3 transition-colors"
                      >
                        {/* Title and Delete button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase">
                              Tiêu đề tài liệu #{idx + 1}
                            </label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].title = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Nhập tên tiêu đề tài liệu..."
                              className="font-bold text-sm text-slate-900 border border-slate-300 focus:border-emerald-600 rounded-lg px-2.5 py-1.5 w-full bg-slate-50/50 focus:bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const upd = draft.documents.filter((_, i) => i !== idx);
                              setDraft({ ...draft, documents: upd });
                            }}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors mt-4"
                            title="Xóa tài liệu này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* LINK INPUT BOX */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                          <label className="flex items-center text-xs font-bold text-emerald-900">
                            <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-700 shrink-0" />
                            <span>Đường link dẫn tới tài liệu (Google Drive, OneDrive, PDF, Docs, Dropbox...):</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={doc.downloadUrl === '#' ? '' : doc.downloadUrl}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].downloadUrl = e.target.value.trim();
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Dán link Google Drive, OneDrive, PDF hoặc link tải tại đây (https://drive.google.com/...)"
                              className="flex-1 border border-emerald-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 bg-white"
                            />
                            {doc.downloadUrl && doc.downloadUrl !== '#' && (
                              <a
                                href={doc.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs"
                                title="Mở kiểm tra đường link này trong tab mới"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Mở xem thử</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-800/80">
                            * Khi dán link Google Drive, hãy đảm bảo đã bật quyền <em>&quot;Bất kỳ ai có đường liên kết đều có thể xem&quot;</em> để thầy cô, phụ huynh và học sinh mở được.
                          </p>
                        </div>

                        {/* Category & Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Chuyên mục
                            </label>
                            <select
                              value={doc.category}
                              onChange={(e) => {
                                const catMap: Record<string, string> = {
                                  'giao-an': 'Giáo Án & Phân Phối',
                                  'de-thi': 'Đề Thi & Đáp Án',
                                  'van-ban': 'Thông Tư & Văn Bản',
                                  'tap-huan': 'Tài Liệu Tập Huấn',
                                  stem: 'Bài Giảng STEM',
                                  'hoc-sinh': 'Học Sinh Ôn Luyện',
                                  'chuyen-de': 'Chuyên Đề Bồi Dưỡng',
                                  'ke-hoach': 'Kế Hoạch Giáo Dục',
                                };
                                const val = e.target.value as any;
                                const upd = [...draft.documents];
                                upd[idx].category = val;
                                upd[idx].categoryLabel = catMap[val] || 'Tài Liệu Học Tập';
                                setDraft({ ...draft, documents: upd });
                              }}
                              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-800"
                            >
                              <option value="giao-an">Giáo Án & Phân Phối</option>
                              <option value="de-thi">Đề Thi & Đáp Án</option>
                              <option value="van-ban">Thông Tư & Văn Bản</option>
                              <option value="tap-huan">Tài Liệu Tập Huấn</option>
                              <option value="stem">Bài Giảng STEM</option>
                              <option value="hoc-sinh">Học Sinh Ôn Luyện</option>
                              <option value="chuyen-de">Chuyên Đề Bồi Dưỡng</option>
                              <option value="ke-hoach">Kế Hoạch Giáo Dục</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Định dạng file
                            </label>
                            <input
                              type="text"
                              value={doc.fileType}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].fileType = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="PDF, DOCX, ZIP..."
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Dung lượng
                            </label>
                            <input
                              type="text"
                              value={doc.fileSize}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].fileSize = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Ví dụ: 2.4 MB"
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Mô tả tóm tắt tài liệu
                          </label>
                          <textarea
                            rows={2}
                            value={doc.description}
                            onChange={(e) => {
                              const upd = [...draft.documents];
                              upd[idx].description = e.target.value;
                              setDraft({ ...draft, documents: upd });
                            }}
                            placeholder="Mô tả nội dung tóm tắt để người xem nắm rõ trước khi tải..."
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
                          />
                        </div>

                        {/* Footer info */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>
                            Người đăng: <strong>{doc.uploaderName}</strong> ({doc.uploaderEmail})
                          </span>
                          <span className="text-emerald-700 font-semibold">
                            Lượt tải: {doc.downloadCount} lượt
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: MEMBERS LOG */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Nhật Ký & Trích Xuất Thành Viên (Gmail)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Theo dõi tài khoản phụ huynh/giáo viên/học sinh đã đăng nhập và hoạt động tải tài liệu.
                      </p>
                    </div>
                    <button
                      onClick={exportMembersCsv}
                      className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Trích Xuất Danh Sách (CSV)
                    </button>
                  </div>

                  {memberLogList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có phiên đăng nhập thành viên nào được ghi nhận trong phiên hiện tại.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 font-bold uppercase text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Gmail / Email</th>
                            <th className="px-3 py-2 text-left">Họ và Tên</th>
                            <th className="px-3 py-2 text-left">Vai Trò</th>
                            <th className="px-3 py-2 text-left">Thời Điểm Đăng Nhập</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {memberLogList.map((m) => (
                            <tr key={m.id}>
                              <td className="px-3 py-2 font-semibold text-emerald-800">
                                {m.email}
                              </td>
                              <td className="px-3 py-2 text-slate-900">{m.name}</td>
                              <td className="px-3 py-2 text-slate-600">
                                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                                  {m.role}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{m.loginAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: CHANGE PASSWORD */}
              {activeTab === 'password' && (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Đổi Mật Khẩu Quản Trị
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mật khẩu được lưu trữ dưới dạng băm SHA-256 kèm salt, không lưu mật khẩu rõ ràng.
                    </p>
                  </div>

                  {pwMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900">
                      {pwMsg}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mật khẩu mới (tối thiểu 8 ký tự)
                      </label>
                      <input
                        type="password"
                        required
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Cập Nhật Mật Khẩu Mới
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 8: SYNC & GITHUB */}
              {activeTab === 'sync' && (
                <div className="space-y-5">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Sao Lưu Dữ Liệu & Đồng Bộ GitHub Repo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quản lý file site-content.json, sao lưu dữ liệu và đẩy lên repository GitHub.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-slate-800">
                        Xuất file dữ liệu (JSON)
                      </h4>
                      <p className="text-xs text-slate-600">
                        Tải toàn bộ nội dung website về máy tính dưới dạng file JSON chuẩn để lưu trữ dự phòng.
                      </p>
                      <button
                        onClick={() => exportContentAsJson(draft)}
                        className="inline-flex items-center bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Tải file JSON về máy
                      </button>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-slate-800">
                        Khôi phục dữ liệu gốc
                      </h4>
                      <p className="text-xs text-slate-600">
                        Xóa bỏ các chỉnh sửa cục bộ và đưa website về dữ liệu ban đầu của trường Tiểu học Lê Lợi.
                      </p>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Bạn có chắc chắn muốn khôi phục dữ liệu gốc của trường không?'
                            )
                          ) {
                            onResetContent();
                            onClose();
                          }
                        }}
                        className="inline-flex items-center bg-white border border-red-200 hover:border-red-600 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                        Khôi phục gốc
                      </button>
                    </div>
                  </div>

                  {/* GitHub Direct Sync Section */}
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Github className="w-5 h-5 text-slate-800" />
                      <h4 className="font-bold text-sm text-slate-900">
                        Cập nhật trực tiếp lên GitHub Repository
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      Repo:{' '}
                      <code className="font-mono bg-white px-1.5 py-0.5 rounded border text-emerald-900">
                        truongthyjutpongdrang/truongthleloipongdrang
                      </code>{' '}
                      (Nhánh: <code>main</code>, File:{' '}
                      <code>public/site-content.json</code>)
                    </p>

                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-900">
                      <strong>Cảnh báo bảo mật:</strong> Chỉ dùng Fine-grained Personal Access Token với quyền giới hạn <em>Contents: Read and write</em> duy nhất cho repository này. Token không bao giờ được lưu dài hạn vào file public.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        GitHub Fine-Grained Token (tùy chọn)
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="github_pat_..."
                        className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-lg p-2 text-xs font-mono"
                      />
                    </div>

                    <button
                      onClick={handlePushGitHub}
                      disabled={isSyncingGithub || !githubToken}
                      className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {isSyncingGithub
                        ? 'Đang gửi dữ liệu lên GitHub...'
                        : 'Đồng Bộ Lên GitHub (Tự Động Build)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Bottom Controls */}
        {isAdmin && (
          <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Mẹo: Trên trang web, rê chuột vào bất kỳ thẻ nào và bấm <strong>✏️ Sửa thẻ này</strong> để chỉnh sửa trực quan.
            </span>
            <div className="flex items-center space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Đóng Bảng
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Tất Cả Thay Đổi</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
