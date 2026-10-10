import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Heart,
  ChevronRight,
  BookOpen,
  Shield,
} from 'lucide-react';
import { SchoolInfo, NavSection } from '../types';

interface FooterProps {
  schoolInfo: SchoolInfo;
  onNavigate: (section: NavSection) => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  showAdminShield?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  schoolInfo,
  onNavigate,
  onOpenAdmin,
  isAdmin,
  showAdminShield = false,
}) => {
  return (
    <footer className="bg-gradient-to-b from-emerald-950 via-slate-950 to-black text-slate-300 pt-16 pb-8 border-t-4 border-emerald-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-emerald-900/60">
          {/* Col 1: School Identity (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0">
                <img
                  src="./favicon.svg"
                  alt="Huy hiệu trường Lê Lợi"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block whitespace-nowrap">
                  CƠ SỞ GIÁO DỤC TIỂU HỌC
                </span>
                <h3 className="text-xl font-extrabold text-white whitespace-nowrap">
                  {schoolInfo.name}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              "{schoolInfo.slogan}"
            </p>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Địa chỉ:</strong> {schoolInfo.fullAddress}
                </span>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                <span>
                  <strong>Điện thoại:</strong>{' '}
                  <a
                    href={`tel:${schoolInfo.phone}`}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {schoolInfo.phone}
                  </a>
                </span>
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                <span>
                  <strong>Email:</strong>{' '}
                  <a
                    href={`mailto:${schoolInfo.email}`}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {schoolInfo.email}
                  </a>
                </span>
              </div>
            </div>

            <div className="text-[11px] text-emerald-300/80 bg-emerald-900/30 border border-emerald-800/40 p-2.5 rounded-xl">
              Gồm 01 trường chính (Thôn Ea Tút) và 02 phân hiệu tại xã Pơng Drang, Đắk Lắk.
            </div>
          </div>

          {/* Col 2: Quick Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-l-2 border-amber-400 pl-2">
              Liên Kết Nhanh
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                { label: 'Trang chủ', id: 'home' as NavSection },
                { label: 'Giới thiệu & Lịch sử', id: 'about' as NavSection },
                { label: 'Ban Giám Hiệu & Giáo viên', id: 'staff' as NavSection },
                { label: 'Tin tức & Thông báo', id: 'news' as NavSection },
                { label: 'Hoạt động giáo dục', id: 'activities' as NavSection },
                { label: 'Tuyển sinh vào lớp 1', id: 'admissions' as NavSection },
                { label: 'Tra cứu thông tin học sinh', id: 'student-lookup' as NavSection },
                { label: 'Kho tài liệu dùng chung', id: 'documents' as NavSection },
                { label: 'Thư viện hình ảnh', id: 'gallery' as NavSection },
                { label: 'Liên hệ nhà trường', id: 'contact' as NavSection },
              ].map((link, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => {
                      onNavigate(link.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-amber-300 transition-colors flex items-center"
                  >
                    <ChevronRight className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Leadership & Branches (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-l-2 border-amber-400 pl-2">
              Ban Giám Hiệu Phụ Trách
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                <span className="font-bold text-white block">
                  Thầy Nguyễn Thanh Bình
                </span>
                <span className="text-emerald-400 text-[11px]">
                  Hiệu trưởng - Quản lý trường chính (Thôn Ea Tút)
                </span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                <span className="font-bold text-white block">
                  Cô Lại Thị Tho
                </span>
                <span className="text-emerald-400 text-[11px]">
                  Phó Hiệu trưởng - Quản lý trường chính (Thôn Ea Tút)
                </span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                <span className="font-bold text-white block">
                  Cô Đỗ Thị Phục
                </span>
                <span className="text-emerald-400 text-[11px]">
                  Phó Hiệu trưởng - Quản lý phân hiệu 1
                </span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                <span className="font-bold text-white block">
                  Thầy Trần Mạnh Thắng
                </span>
                <span className="text-emerald-400 text-[11px]">
                  Phó Hiệu trưởng - Quản lý phân hiệu 2
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 pt-6 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Trường Tiểu Học Lê Lợi - Xã Pơng Drang, Tỉnh Đắk Lắk. Tất cả quyền được bảo lưu.
          </p>
          <div className="text-center sm:text-right text-[11px] text-slate-600 flex items-center justify-center sm:justify-end gap-1.5">
            <span>Học tập - Kỷ cương - Tình thương - Trách nhiệm</span>
            {onOpenAdmin && (isAdmin || showAdminShield) && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center justify-center text-amber-400 hover:text-amber-300 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 p-1 rounded-sm transition-all cursor-pointer shadow-xs animate-in fade-in zoom-in-95 duration-200"
                title={isAdmin ? "Bảng điều khiển Quản trị viên" : "Bấm để mở bảng đăng nhập Quản trị"}
                aria-label="Đăng nhập quản trị viên"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
