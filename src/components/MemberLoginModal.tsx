import React, { useState } from 'react';
import {
  X,
  Mail,
  ShieldCheck,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { MemberUser } from '../types';
import {
  signInMemberWithGoogle,
  isFirebaseSdkReady,
} from '../firebaseAuthStore';
import { isTrustedPreviewEnvironment } from '../authEnvironment';

interface MemberLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember?: MemberUser | null;
  onLoginSuccess: (member: MemberUser) => void;
  onLogout?: () => void;
  onOpenParentLookup?: () => void;
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  isOpen,
  onClose,
  currentMember = null,
  onLoginSuccess,
  onLogout,
  onOpenParentLookup,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const isPreview = isTrustedPreviewEnvironment();
  const firebaseReady = isFirebaseSdkReady();

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMsg('');

    if (isPreview) {
      setError(
        'Môi trường xem trước AI Studio được cách ly an toàn khỏi Firebase Production. Đăng nhập Google chính thức sẽ hoạt động trực tiếp trên website nhà trường.'
      );
      return;
    }

    if (!firebaseReady) {
      setError(
        'Hệ thống chưa được cấu hình đầy đủ khóa kết nối Firebase. Vui lòng liên hệ quản trị viên nhà trường.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await signInMemberWithGoogle();
      if (result.redirected) {
        setInfoMsg(
          'Đang chuyển hướng sang trang xác thực Google chính thức...'
        );
        return;
      }
      onLoginSuccess(result.member);
      onClose();
    } catch (err: any) {
      setError(
        err?.message || 'Đăng nhập bằng Google chưa thành công. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setError('');
    setInfoMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-emerald-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Đăng Nhập Thành Viên (Google)
              </h3>
              <p className="text-[11px] text-emerald-200">
                Xác thực chính thức qua Firebase Authentication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ đăng nhập"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {currentMember ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3">
                {currentMember.photoURL ? (
                  <img
                    src={currentMember.photoURL}
                    alt={currentMember.name}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-lg shrink-0">
                    {(currentMember.name || currentMember.email || 'T').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {currentMember.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{currentMember.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Tài khoản Thành viên đã xác thực Google
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Quyền hạn thành viên:</span>
                </p>
                <p>• Xem và tải các tài liệu công khai có đường dẫn thật trong Kho Tài Liệu.</p>
                <p>• Gửi đóng góp liên kết học liệu mới vào hàng chờ quản trị viên kiểm duyệt.</p>
              </div>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất Tài Khoản Google</span>
              </button>
            </div>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-emerald-950">
                    Xác thực an toàn bằng tài khoản Google
                  </p>
                  <p>
                    Quý thầy cô, phụ huynh và bạn đọc đăng nhập bằng Google để tải tài liệu học tập và gửi đóng góp học liệu chờ nhà trường kiểm duyệt. Phiên đăng nhập được duy trì an toàn khi tải lại trang.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {infoMsg && (
                <div className="bg-sky-50 border border-sky-200 text-sky-900 text-xs p-3 rounded-xl flex items-start space-x-2">
                  <Loader2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5 animate-spin" />
                  <span className="leading-relaxed font-medium">{infoMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-slate-50 border-2 border-emerald-600 text-slate-900 font-extrabold py-3 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center space-x-3 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                    <span>Đang xác thực với Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Đăng nhập bằng Google</span>
                    <LogIn className="w-4 h-4 text-emerald-700" />
                  </>
                )}
              </button>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-2 leading-relaxed">
                <p>
                  • Tài khoản thành viên Google là quyền thành viên cơ bản, <strong>không</strong> cấp quyền quản trị và <strong>không</strong> tự động xem dữ liệu học sinh.
                </p>
                <p>
                  • Phụ huynh cần tra cứu kết quả học tập của con em vui lòng đăng nhập bằng tài khoản Phụ huynh (Email/Mật khẩu) tại mục <strong>Tra Cứu</strong>.
                </p>
                {onOpenParentLookup && (
                  <button
                    type="button"
                    onClick={onOpenParentLookup}
                    className="w-full mt-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Chuyển sang Đăng Nhập Phụ Huynh (Tra Cứu Kết Quả) →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
