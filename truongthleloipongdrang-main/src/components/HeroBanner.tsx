import React from 'react';
import {
  Sparkles,
  Award,
  Users,
  BookOpen,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Edit,
} from 'lucide-react';
import { SchoolInfo, EditableCardPayload, NavSection } from '../types';

interface HeroBannerProps {
  schoolInfo: SchoolInfo;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  onNavigate: (section: NavSection) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  schoolInfo,
  isAdmin,
  onEditCard,
  onNavigate,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 text-white py-12 lg:py-18 px-4 sm:px-6 lg:px-8 shadow-xl">
      {/* Subtle Tây Nguyên mountain patterns background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Main Hero Text */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{schoolInfo.heroBadge || 'CƠ SỞ GIÁO DỤC TIỂU HỌC CHẤT LƯỢNG CAO - ĐẮK LẮK'}</span>
              <span className="text-amber-300">★ ★ ★</span>
            </div>

            {/* Title & Slogan */}
            <div className="relative group">
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'schoolInfo',
                      title: schoolInfo.name,
                      subtitle: schoolInfo.slogan,
                      content:
                        schoolInfo.heroDescription ||
                        'Tọa lạc tại Xã Pơng Drang, Tỉnh Đắk Lắk. Ngôi trường thân yêu kết nối trường chính (Thôn Ea Tút) cùng 2 phân hiệu kiên cố, nơi ươm mầm tri thức và thắp sáng tương lai cho thế hệ măng non các dân tộc anh em giữa đại ngàn Tây Nguyên.',
                      extraField1Label: 'Danh hiệu / Huy hiệu trên cùng',
                      extraField1Value:
                        schoolInfo.heroBadge ||
                        'CƠ SỞ GIÁO DỤC TIỂU HỌC CHẤT LƯỢNG CAO - ĐẮK LẮK',
                      extraField2Label: 'Địa chỉ trường học',
                      extraField2Value: schoolInfo.fullAddress,
                      extraField3Label: 'Mức đạt chuẩn Quốc gia',
                      extraField3Value: schoolInfo.stats.standardLevel,
                      extraField4Label: 'Năm thành lập',
                      extraField4Value: schoolInfo.establishedYear,
                      extraField5Label: 'Số điện thoại Hotline',
                      extraField5Value: schoolInfo.phone,
                      extraField6Label: 'Email nhà trường',
                      extraField6Value: schoolInfo.email,
                    })
                  }
                  className="absolute -top-3 -right-2 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-lg flex items-center space-x-1"
                  title="Sửa tiêu đề, khẩu hiệu & nội dung giới thiệu trường"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight whitespace-nowrap">
                <span className="inline-block whitespace-nowrap">{schoolInfo.name}</span>
              </h1>
              <p className="mt-2 text-lg sm:text-xl font-bold text-amber-300 italic tracking-wide">
                "{schoolInfo.slogan}"
              </p>
              <p className="mt-3 text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                {schoolInfo.heroDescription ||
                  'Tọa lạc tại Xã Pơng Drang, Tỉnh Đắk Lắk. Ngôi trường thân yêu kết nối trường chính (Thôn Ea Tút) cùng 2 phân hiệu kiên cố, nơi ươm mầm tri thức và thắp sáng tương lai cho thế hệ măng non các dân tộc anh em giữa đại ngàn Tây Nguyên.'}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigate('admissions')}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold px-5 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl hover:scale-102"
              >
                <span>Đăng Ký Tuyển Sinh Lớp 1</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('documents')}
                className="inline-flex items-center space-x-2 bg-emerald-800/90 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-sm border border-emerald-600/60 transition-all shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <span>Kho Tài Liệu Học Liệu</span>
              </button>

              <button
                onClick={() => onNavigate('student-lookup')}
                className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-emerald-100 font-semibold px-4 py-3 rounded-xl text-sm border border-white/20 transition-all backdrop-blur-xs"
              >
                <span>Tra Cứu Học Sinh</span>
              </button>
            </div>

            {/* Key Badges */}
            <div className="pt-3 border-t border-emerald-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-emerald-200">
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-emerald-400" />
                {schoolInfo.commune || 'Xã Pơng Drang'} - {schoolInfo.province || 'Tỉnh Đắk Lắk'}
              </span>
              <span className="flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-amber-400" />
                {schoolInfo.stats.standardLevel}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-emerald-400" />
                Thành lập: {schoolInfo.establishedYear}
              </span>
            </div>
          </div>

          {/* Statistics Grid (Right Column) */}
          <div className="lg:col-span-4">
            <div className="bg-emerald-900/60 border border-emerald-700/50 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-2xl relative">
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'schoolStats',
                      title: 'Quy Mô Giáo Dục Nhà Trường',
                      subtitle: schoolInfo.statsAcademicYear || '2026 - 2027',
                      content:
                        schoolInfo.leadershipText ||
                        '• Trường chính: Thầy Nguyễn Thanh Bình - Hiệu trưởng\n• Phân hiệu 1: Cô Đỗ Thị Phục - Phó Hiệu trưởng\n• Phân hiệu 2: Thầy Trần Mạnh Thắng - Phó Hiệu trưởng',
                      extraField1Label: 'Số học sinh (VD: 685)',
                      extraField1Value: String(schoolInfo.stats.studentsCount),
                      extraField2Label: 'Số cán bộ & giáo viên (VD: 38)',
                      extraField2Value: String(schoolInfo.stats.teachersCount),
                      extraField3Label: 'Số lớp học (VD: 22)',
                      extraField3Value: String(schoolInfo.stats.classesCount),
                      extraField4Label: 'Số điểm trường (VD: 3)',
                      extraField4Value: String(schoolInfo.stats.branchesCount),
                      extraField5Label: 'Niên khóa hiển thị',
                      extraField5Value: schoolInfo.statsAcademicYear || '2026 - 2027',
                    })
                  }
                  className="absolute -top-3 -right-2 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-lg flex items-center space-x-1"
                  title="Sửa số liệu quy mô nhà trường"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ quy mô</span>
                </button>
              )}

              <div className="flex items-center justify-between border-b border-emerald-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-emerald-200 uppercase tracking-wider flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-amber-400" />
                  Quy Mô Giáo Dục Nhà Trường
                </h3>
                <span className="text-[10px] bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                  {schoolInfo.statsAcademicYear || '2026 - 2027'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-3.5 text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-amber-400">
                    {schoolInfo.stats.studentsCount}+
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">Học Sinh Thân Yêu</span>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-3.5 text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-emerald-300">
                    {schoolInfo.stats.teachersCount}
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">Cán Bộ & Giáo Viên</span>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-3.5 text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-emerald-300">
                    {schoolInfo.stats.classesCount}
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">Lớp Học Khối 1 - 5</span>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-3.5 text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-amber-400">
                    {schoolInfo.stats.branchesCount}
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">Điểm Trường (1+2)</span>
                </div>
              </div>

              {/* Leadership highlights */}
              <div className="mt-4 pt-3 border-t border-emerald-800/80 text-xs text-emerald-200/90 space-y-1">
                {schoolInfo.leadershipText ? (
                  schoolInfo.leadershipText.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))
                ) : (
                  <>
                    <p>
                      • <strong>Trường chính:</strong> Thầy Nguyễn Thanh Bình - Hiệu trưởng
                    </p>
                    <p>
                      • <strong>Phân hiệu 1:</strong> Cô Đỗ Thị Phục - Phó Hiệu trưởng
                    </p>
                    <p>
                      • <strong>Phân hiệu 2:</strong> Thầy Trần Mạnh Thắng - Phó Hiệu trưởng
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
