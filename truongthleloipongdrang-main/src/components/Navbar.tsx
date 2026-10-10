import React, { useState } from 'react';
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
} from 'lucide-react';
import { NavSection, SchoolInfo, MemberUser } from '../types';

interface NavbarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  schoolInfo: SchoolInfo;
  isAdmin: boolean;
  showAdminButton?: boolean;
  onOpenAdmin: () => void;
  onAdminLogout: () => void;
  currentMember: MemberUser | null;
  onOpenMemberLogin: () => void;
  onMemberLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onNavigate,
  schoolInfo,
  isAdmin,
  showAdminButton = false,
  onOpenAdmin,
  onAdminLogout,
  currentMember,
  onOpenMemberLogin,
  onMemberLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

