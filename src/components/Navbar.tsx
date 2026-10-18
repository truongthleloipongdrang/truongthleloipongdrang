import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  Menu,
  X,
  Phone,
  User,
  ShieldCheck,
  Search,
  BookOpen,
  LogIn,
  LogOut,
  Sparkles,
  Home,
  Info,
  Users,
  Newspaper,
  GraduationCap,
  Image,
  Bell,
  Download,
  CheckCircle2,
  Clock,
  ChevronRight,
  Trash2,
  MessageSquareText,
  Lock,
} from 'lucide-react';
import { NavSection, SchoolInfo, MemberUser, AdmissionRegistration, FeedbackSubmission } from '../types';
import {
  getStoredRegistrations,
  exportRegistrationsToExcel,
  clearAllRegistrations,
  ADMISSIONS_UPDATE_EVENT,
  NEW_ADMISSION_NOTIFICATION_EVENT,
} from '../admissionsStorage';
import {
  getStoredFeedback,
  exportFeedbackToExcel,
  clearAllFeedback,
  FEEDBACK_UPDATE_EVENT,
  NEW_FEEDBACK_NOTIFICATION_EVENT,
} from '../feedbackStorage';

interface NavbarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  schoolInfo: SchoolInfo;
  isAdmin: boolean;
  showAdminButton?: boolean;
  onOpenAdmin: () => void;
  onOpenAdminAdmissions?: () => void;
  onOpenAdminFeedback?: () => void;
  onAdminLogout: () => void;
  currentMember: MemberUser | null;
  onOpenMemberLogin: () => void;
  onMemberLogout: () => void;
  onOpenAdmissionsSummary?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onNavigate,
  schoolInfo,
  isAdmin,
  showAdminButton = false,
  onOpenAdmin,
  onOpenAdminAdmissions,
  onOpenAdminFeedback,
  onAdminLogout,
  currentMember,
  onOpenMemberLogin,
  onMemberLogout,
  onOpenAdmissionsSummary,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  const [registrations, setRegistrations] = useState<AdmissionRegistration[]>(() =>
    getStoredRegistrations()
  );
  const [confirmClearAllNav, setConfirmClearAllNav] = useState(false);

  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>(() =>
    getStoredFeedback()
  );
  const [showFeedbackMenu, setShowFeedbackMenu] = useState(false);
  const feedbackMenuRef = useRef<HTMLDivElement>(null);
  const [confirmClearFeedbackNav, setConfirmClearFeedbackNav] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setRegistrations(getStoredRegistrations());
    };
    window.addEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
    window.addEventListener(NEW_ADMISSION_NOTIFICATION_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
      window.removeEventListener(NEW_ADMISSION_NOTIFICATION_EVENT, handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleFbUpdate = () => {
      setFeedbackList(getStoredFeedback());
    };
    window.addEventListener(FEEDBACK_UPDATE_EVENT, handleFbUpdate);
    window.addEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFbUpdate);
    return () => {
      window.removeEventListener(FEEDBACK_UPDATE_EVENT, handleFbUpdate);
      window.removeEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFbUpdate);
    };
  }, []);

  // Close notification menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(e.target as Node)
      ) {
        setShowNotificationMenu(false);
      }
    };
    if (showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationMenu]);

  // Close feedback menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        feedbackMenuRef.current &&
        !feedbackMenuRef.current.contains(e.target as Node)
      ) {
        setShowFeedbackMenu(false);
      }
    };
    if (showFeedbackMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFeedbackMenu]);

  const pendingCount = registrations.filter((r) => r.status === 'pending').length;
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length;

  const navItems: { id: NavSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Trang Chủ', icon: Home },
    { id: 'about', label: 'Giới Thiệu', icon: Info },
    { id: 'staff', label: 'BGH - Đội Ngũ', icon: Users },
    { id: 'news', label: 'Tin Tức', icon: Newspaper },
    { id: 'activities', label: 'Hoạt Động', icon: Sparkles },
    { id: 'tuyen-sinh' as unknown as NavSection, label: 'Tuyển Sinh', icon: GraduationCap },
    { id: 'student-lookup', label: 'Tra Cứu', icon: Search },
    { id: 'documents', label: 'Tài Liệu', icon: BookOpen },
    { id: 'gallery', label: 'Thư Viện Ảnh', icon: Image },
    { id: 'contact', label: 'Liên Hệ', icon: Phone },
  ];

  const handleNavClick = (id: NavSection | string) => {
    const target = id === 'tuyen-sinh' ? 'admissions' : (id as NavSection);
    onNavigate(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('news');
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-emerald-100">
      {/* 1. Top bar with Highland Green gradient */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 text-white text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></span>
              {schoolInfo.address}, {schoolInfo.commune}, {schoolInfo.province}
            </span>
            <span className="hidden md:inline text-emerald-300">|</span>
            <a
              href={`tel:${schoolInfo.phone}`}
              className="hidden md:flex items-center text-emerald-100 hover:text-amber-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 mr-1" />
              Hotline: {schoolInfo.phone}
            </a>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            {/* Admissions Notification Center - Nút thông báo tuyển sinh vẫn hiện khi có phụ huynh đăng ký */}
            {(isAdmin || registrations.length > 0) && (
              <div className="relative" ref={notificationMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs cursor-pointer transition-all ${
                    pendingCount > 0
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-400/40'
                      : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/40'
                  }`}
                  title="Thông báo phụ huynh đăng ký tuyển sinh"
                >
                  <Bell className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'text-slate-950 animate-bounce' : 'text-amber-300'}`} />
                  <span className="font-semibold">Tuyển Sinh</span>
                  {pendingCount > 0 ? (
                    <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {pendingCount} mới
                    </span>
                  ) : (
                    <span className="bg-emerald-950/70 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full">
                      {registrations.length}
                    </span>
                  )}
                </button>

                {/* Notification Popover Dropdown */}
                {showNotificationMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-emerald-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">
                            Tiếp Nhận Đăng Ký Tuyển Sinh
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            {registrations.length} hồ sơ • {pendingCount} chưa liên hệ
                          </p>
                        </div>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          {pendingCount} đơn mới
                        </span>
                      )}
                    </div>

                    {/* Quick registrations list preview */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                      {registrations.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                          <p className="font-semibold">Danh sách đang trống</p>
                          <p className="text-[10px] text-slate-400">
                            Khi phụ huynh đăng ký, thông báo sẽ hiển thị tại đây.
                          </p>
                        </div>
                      ) : (
                        registrations.slice(0, 3).map((reg) => (
                          <div
                            key={reg.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-300 transition-colors space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{reg.parentName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  reg.status === 'contacted'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {reg.status === 'contacted' ? 'Đã liên hệ' : 'Chưa liên hệ'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 flex items-center justify-between">
                              <span>HS: <strong>{reg.childName}</strong> ({reg.campusChoice})</span>
                              <a
                                href={`tel:${reg.phone}`}
                                className="font-mono text-emerald-700 hover:underline font-bold"
                              >
                                {reg.phone}
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actions: Chỉ khi quản trị viên đăng nhập thì 2 nút Tải Excel & Xem Danh Sách mới hiện ra */}
                    {isAdmin ? (
                      <div className="pt-3 mt-2.5 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            exportRegistrationsToExcel(registrations);
                            setShowNotificationMenu(false);
                          }}
                          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="Tải toàn bộ danh sách phụ huynh đăng ký ra file Excel (.xlsx)"
                        >
                          <Download className="w-4 h-4" />
                          <span>Tải Danh Sách Tổng Hợp (Excel)</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationMenu(false);
                              if (onOpenAdmissionsSummary) {
                                onOpenAdmissionsSummary();
                              } else {
                                onNavigate('admissions');
                              }
                            }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 px-2.5 rounded-lg text-[11px] text-center transition-colors cursor-pointer"
                          >
                            Xem Danh Sách ({registrations.length})
                          </button>

                          {onOpenAdminAdmissions && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNotificationMenu(false);
                                onOpenAdminAdmissions();
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Quản Trị
                            </button>
                          )}
                        </div>

                        {/* Nút xoá tất cả danh sách khi đã tuyển sinh xong (chỉ quản trị viên mới được thao tác) */}
                        {registrations.length > 0 && (
                          confirmClearAllNav ? (
                            <div className="w-full flex items-center justify-between gap-1 p-1 bg-red-100 border border-red-300 rounded-lg text-xs animate-in fade-in">
                              <span className="text-[10px] font-bold text-red-900 px-1">Xóa sạch?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearAllRegistrations();
                                    setConfirmClearAllNav(false);
                                    setShowNotificationMenu(false);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-xs cursor-pointer"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmClearAllNav(false)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmClearAllNav(true)}
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer border border-red-200/60"
                              title="Xoá toàn bộ danh sách khi nhà trường đã hoàn tất đợt tuyển sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Xóa Tất Cả Danh Sách (Đã Tuyển Sinh Xong)</span>
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 mt-2 border-t border-slate-100 text-center">
                        <p className="text-[11px] text-slate-500">
                          Nhà trường sẽ liên hệ tư vấn chu đáo theo thông tin đăng ký của phụ huynh.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feedback / Contact Notifications - Nút thông báo ý kiến đóng góp */}
            {(isAdmin || feedbackList.length > 0) && (
              <div className="relative" ref={feedbackMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      setShowFeedbackMenu(!showFeedbackMenu);
                    }
                  }}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs transition-all ${
                    isAdmin ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                  } ${
                    pendingFeedbackCount > 0
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
                      : 'bg-emerald-800/80 text-emerald-100 border border-emerald-600/40'
                  }`}
                  title={isAdmin ? 'Bấm để xem hộp thư ý kiến đóng góp' : undefined}
                >
                  <MessageSquareText className={`w-3.5 h-3.5 ${pendingFeedbackCount > 0 ? 'text-slate-950 animate-bounce' : 'text-amber-300'}`} />
                  <span className="font-semibold">Ý Kiến</span>
                  {pendingFeedbackCount > 0 ? (
                    <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {pendingFeedbackCount} mới
                    </span>
                  ) : (
                    <span className="bg-emerald-950/70 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full">
                      {feedbackList.length}
                    </span>
                  )}
                </button>

                {/* Feedback Popover Dropdown - CHỈ hiển thị khi Quản trị viên đã đăng nhập */}
                {isAdmin && showFeedbackMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-emerald-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <MessageSquareText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">
                            Hộp Thư Ý Kiến Đóng Góp
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            {feedbackList.length} ý kiến • {pendingFeedbackCount} chưa phản hồi
                          </p>
                        </div>
                      </div>
                      {pendingFeedbackCount > 0 && (
                        <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          {pendingFeedbackCount} mới
                        </span>
                      )}
                    </div>

                    {/* Quick feedback list preview (Admin only) */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                      {feedbackList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          <MessageSquareText className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                          <p className="font-semibold">Chưa có ý kiến đóng góp</p>
                        </div>
                      ) : (
                        feedbackList.slice(0, 3).map((fb) => (
                          <div
                            key={fb.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-300 transition-colors space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                                {fb.fullName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {fb.submittedAt}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 line-clamp-2 italic bg-white p-2 rounded-lg border border-slate-100">
                              "{fb.message}"
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[10px] font-semibold text-emerald-700 font-mono">
                                SĐT: {fb.phone}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  fb.status === 'resolved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900 font-extrabold'
                                }`}
                              >
                                {fb.status === 'resolved' ? 'Đã tiếp thu' : 'Chờ phản hồi'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actions in Dropdown for Admin */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          exportFeedbackToExcel(feedbackList);
                          setShowFeedbackMenu(false);
                        }}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-950" />
                        <span>Tải Danh Sách Tổng Hợp (Excel)</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowFeedbackMenu(false);
                            if (onOpenAdminFeedback) onOpenAdminFeedback();
                            else if (onOpenAdmin) onOpenAdmin();
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Xem Toàn Bộ Ý Kiến</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Nút xoá tất cả ý kiến khi quản trị viên đăng nhập */}
                      {feedbackList.length > 0 && (
                        confirmClearFeedbackNav ? (
                          <div className="w-full flex items-center justify-between gap-1 p-1 bg-red-100 border border-red-300 rounded-lg text-xs animate-in fade-in">
                            <span className="text-[10px] font-bold text-red-900 px-1">Xóa sạch?</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  clearAllFeedback();
                                  setConfirmClearFeedbackNav(false);
                                  setShowFeedbackMenu(false);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-xs cursor-pointer"
                              >
                                Đồng ý
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearFeedbackNav(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmClearFeedbackNav(true)}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer border border-red-200/60"
                            title="Xóa toàn bộ danh sách ý kiến đóng góp"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Xóa Tất Cả Hộp Thư Ý Kiến</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Member Login button - Always visible */}
            {currentMember ? (
              <div className="flex items-center bg-emerald-700/60 border border-emerald-500/40 text-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                <User className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                <span className="max-w-[120px] truncate font-medium">
                  {currentMember.name || currentMember.email}
                </span>
                <button
                  onClick={onMemberLogout}
                  className="ml-2 text-emerald-300 hover:text-amber-300 cursor-pointer"
                  title="Đăng xuất thành viên"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenMemberLogin}
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-0.5 rounded-full text-[11px] transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-3 h-3 mr-1" />
                Đăng nhập thành viên (Gmail)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Identity & Branding Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & School Name - Always strictly on 1 single line */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-0.5 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center p-1 sm:p-1.5 overflow-hidden">
                <img
                  src="./favicon.svg"
                  alt="Huy hiệu Trường Tiểu Học Lê Lợi"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="shrink-0">
              <span className="block text-[10px] sm:text-xs uppercase tracking-widest text-emerald-800 font-bold whitespace-nowrap">
                CỔNG THÔNG TIN ĐIỆN TỬ
              </span>
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors whitespace-nowrap">
                {schoolInfo.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block whitespace-nowrap">
                Xã Pơng Drang - Tỉnh Đắk Lắk
              </p>
            </div>
          </div>

          {/* Quick Search & Hotline on Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            <form onSubmit={handleSearchSubmit} className="relative w-52 xl:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tin tức, tài liệu..."
                className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            <a
              href={`tel:${schoolInfo.phone}`}
              className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{schoolInfo.phone}</span>
            </a>
          </div>

          {/* Mobile Actions: Search & Menu toggle */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => handleNavClick('student-lookup')}
              className="inline-flex sm:hidden items-center p-2 rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              title="Tra cứu học sinh"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Primary Navigation Ribbon (Thanh Điều Hướng Ngang Đẳng Cấp Cho Desktop) */}
      <div className="hidden lg:block border-t border-emerald-100/90 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Desktop Navigation Links with Icons & Elegant Active Indicators */}
            <nav className="flex items-center space-x-1 xl:space-x-2 w-full justify-start">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentSection === item.id ||
                  (item.id === ('tuyen-sinh' as unknown as NavSection) &&
                    currentSection === 'admissions');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`group inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs xl:text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold shadow-xs shadow-emerald-900/20'
                        : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/90 hover:shadow-2xs'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive
                          ? 'text-amber-300'
                          : 'text-slate-400 group-hover:text-emerald-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* 4. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-emerald-100 px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tin tức, thông báo, tài liệu..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-emerald-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentSection === item.id ||
                (item.id === ('tuyen-sinh' as unknown as NavSection) &&
                  currentSection === 'admissions');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-2 text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col space-y-2">
            {!currentMember ? (
              <button
                onClick={() => {
                  onOpenMemberLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Gmail (Tải tài liệu)</span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-lg text-xs text-emerald-900">
                <span className="truncate">Thành viên: {currentMember.email}</span>
                <button
                  onClick={onMemberLogout}
                  className="text-red-600 font-semibold ml-2 underline"
                >
                  Thoát
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

