import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  X,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  Download,
  CheckCircle,
} from 'lucide-react';
import { FeedbackSubmission } from '../types';
import {
  NEW_FEEDBACK_NOTIFICATION_EVENT,
  exportFeedbackToExcel,
  getStoredFeedback,
} from '../feedbackStorage';

interface FeedbackNotificationToastProps {
  isAdmin?: boolean;
  onOpenAdminFeedback?: () => void;
  onOpenAdminLogin?: () => void;
}

export const FeedbackNotificationToast: React.FC<FeedbackNotificationToastProps> = ({
  isAdmin = false,
  onOpenAdminFeedback,
  onOpenAdminLogin,
}) => {
  const [notification, setNotification] = useState<FeedbackSubmission | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleNewFeedback = (e: Event) => {
      const customEvent = e as CustomEvent<FeedbackSubmission>;
      if (customEvent.detail) {
        setNotification(customEvent.detail);
        setIsMinimized(false);
      }
    };

    window.addEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleNewFeedback);
    return () => window.removeEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleNewFeedback);
  }, []);

  if (!notification) return null;

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="bg-emerald-800 text-white hover:bg-emerald-700 px-3 py-2 rounded-2xl shadow-xl flex items-center space-x-2 border border-emerald-500/50 cursor-pointer text-xs"
        >
          <MessageSquareText className="w-4 h-4 text-emerald-300 animate-bounce" />
          <span className="font-bold">Có ý kiến đóng góp mới!</span>
          <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
            Xem
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="fixed top-20 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] bg-slate-900/95 text-white rounded-3xl shadow-2xl border-2 border-emerald-500/60 p-4 sm:p-5 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <MessageSquareText className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
              Ý KIẾN ĐÓNG GÓP / PHẢN ÁNH MỚI
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">
              Người dân / Phụ huynh vừa gửi trao đổi!
            </h4>
          </div>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-xs"
            title="Thu nhỏ thông báo"
          >
            Thu nhỏ
          </button>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Information */}
      <div className="py-3 space-y-2.5 text-xs text-slate-300">
        <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Người gửi:</span>
            <span className="font-bold text-white text-sm">{notification.fullName}</span>
          </div>

          {isAdmin ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Số điện thoại:</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <a
                    href={`tel:${notification.phone}`}
                    className="hover:underline font-mono text-sm"
                  >
                    {notification.phone}
                  </a>
                </div>
              </div>

              {notification.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{notification.email}</span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-medium">Số điện thoại & Email:</span>
              <span className="font-mono text-[11px] text-amber-300 flex items-center gap-1">
                🔒 Đã bảo mật
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>{notification.submittedAt}</span>
            </span>
            <span className="text-amber-300 font-medium bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px]">
              Chờ Ban Giám hiệu phản hồi
            </span>
          </div>
        </div>

        {/* Message preview / Contact content */}
        {isAdmin ? (
          <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-emerald-300 block mb-1">
              Nội dung liên hệ / trao đổi:
            </span>
            <p className="text-slate-200 text-xs italic leading-relaxed line-clamp-3">
              "{notification.message}"
            </p>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-2xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
              <span>🔒 Nội dung liên hệ trao đổi được bảo mật</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed italic">
              Ý kiến đã được chuyển trực tiếp tới Ban Giám hiệu nhà trường. Quản trị viên vui lòng đăng nhập để xem nội dung trao đổi.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-1.5">
              {onOpenAdminFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    setNotification(null);
                    onOpenAdminFeedback();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <span>Xem Hộp Thư Ý Kiến</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => exportFeedbackToExcel(getStoredFeedback())}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                title="Tải toàn bộ ý kiến dạng file Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Excel</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer ml-auto"
            >
              Đóng
            </button>
          </>
        ) : (
          <>
            {onOpenAdminLogin ? (
              <button
                type="button"
                onClick={() => {
                  setNotification(null);
                  onOpenAdminLogin();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
              >
                <span>Đăng nhập quản trị để xem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-medium">
                ✓ Đã chuyển tới BGH nhà trường
              </span>
            )}
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ml-auto"
            >
              Đã hiểu
            </button>
          </>
        )}
      </div>
    </div>
  );
};
