import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Edit,
  GraduationCap,
  Filter,
  Maximize2,
  X,
  ChevronRight,
  BookOpen,
  Eye,
} from 'lucide-react';
import { SiteContent, EditableCardPayload, Teacher, PrincipalLeader } from '../types';

interface StaffSectionProps {
  content: SiteContent;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

type StaffModalItem =
  | { type: 'principal'; data: PrincipalLeader }
  | { type: 'teacher'; data: Teacher };

export const StaffSection: React.FC<StaffSectionProps> = ({
  content,
  isAdmin,
  onEditCard,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('Tất cả');
  const [selectedStaff, setSelectedStaff] = useState<StaffModalItem | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPhotoZoomed) {
          setIsPhotoZoomed(false);
        } else if (selectedStaff) {
          setSelectedStaff(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStaff, isPhotoZoomed]);

  const gradeOptions = ['Tất cả', 'Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5'];

  const filteredTeachers =
    selectedGrade === 'Tất cả'
      ? content.teachers
      : content.teachers.filter((t) => {
          const target = selectedGrade.toLowerCase(); // e.g. "khối 1"
          const num = target.replace('khối', '').trim(); // e.g. "1"

          const campus = (t.campus || '').toLowerCase();
          const subject = (t.subjectOrGrade || '').toLowerCase();

          // 1. Khớp trực tiếp nếu ghi rõ khối trong campus hoặc môn dạy/khối phụ trách
          if (
            campus.includes(target) ||
            subject.includes(target) ||
            subject.includes(`lớp ${num}`) ||
            subject.includes(`k${num}`)
          ) {
            return true;
          }

          // 2. Giáo viên bộ môn dạy nhiều khối (ví dụ: "Khối 3, 4, 5" khớp Khối 3, Khối 4, Khối 5)
          if ((subject.includes('khối') || subject.includes('môn')) && subject.includes(num)) {
            return true;
          }

          // 3. Tương thích dữ liệu cũ nếu lưu "Trường chính", "Phân hiệu 1", "Phân hiệu 2"
          if (selectedGrade === 'Khối 1' && (campus === 'trường chính' || subject.includes('khối 1'))) return true;
          if (selectedGrade === 'Khối 2' && (campus === 'phân hiệu 1' || subject.includes('khối 2'))) return true;
          if (selectedGrade === 'Khối 3' && (campus === 'phân hiệu 2' || subject.includes('khối 3'))) return true;
          if (selectedGrade === 'Khối 4' && subject.includes('khối 4')) return true;
          if (selectedGrade === 'Khối 5' && subject.includes('khối 5')) return true;

          // 4. Giáo viên phụ trách toàn trường (như Tổng phụ trách Đội)
          if (campus === 'toàn trường' || subject.includes('toàn trường')) {
            return true;
          }

          return false;
        });

  // Ban Giám Hiệu ordering:
  // 1. Thầy Nguyễn Thanh Bình (Hiệu trưởng)
  // 2. Cô Lại Thị Tho (Phó Hiệu trưởng - Trường chính)
  // 3. Cô Đỗ Thị Phục (Phó Hiệu trưởng - Phân hiệu 1)
  // 4. Thầy Trần Mạnh Thắng (Phó Hiệu trưởng - Phân hiệu 2)
  const ORDERED_PRINCIPAL_IDS = ['principal-1', 'principal-4', 'principal-2', 'principal-3'];
  const sortedPrincipals = [...content.principals].sort((a, b) => {
    const idxA = ORDERED_PRINCIPAL_IDS.indexOf(a.id);
    const idxB = ORDERED_PRINCIPAL_IDS.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  return (
    <div className="space-y-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          ĐỘI NGŨ SƯ PHẠM
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          Ban Giám Hiệu & Hội Đồng Sư Phạm
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Tập thể cán bộ giáo viên tâm huyết, chuẩn mực về đạo đức, vững vàng về
          chuyên môn, hết lòng vì học sinh thân yêu tại Trường Tiểu học Lê Lợi.
        </p>
      </div>

      {/* 2. Ban Giám Hiệu (Đội ngũ cán bộ quản lý nhà trường) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-2 border-b border-emerald-200 pb-3">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-black text-slate-900">
            Ban Giám Hiệu Nhà Trường
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedPrincipals.map((leader) => (
            <div
              key={leader.id}
              onClick={() => setSelectedStaff({ type: 'principal', data: leader })}
              className="relative group bg-white border border-emerald-100 hover:border-emerald-500 rounded-3xl p-6 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between cursor-pointer"
            >
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCard({
                      sectionKey: 'principals',
                      itemId: leader.id,
                      title: leader.name,
                      subtitle: leader.title,
                      content: leader.bio,
                      imageUrl: leader.avatar,
                      extraField1Label: 'Phân công nhiệm vụ',
                      extraField1Value: leader.roleScope,
                      extraField2Label: 'Phụ trách cơ sở',
                      extraField2Value: leader.campus,
                      extraField3Label: 'Số điện thoại liên hệ',
                      extraField3Value: leader.phone || '',
                      extraField4Label: 'Email công vụ',
                      extraField4Value: leader.email || '',
                    });
                  }}
                  className="absolute top-3 right-3 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <div className="space-y-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-2xl overflow-hidden border-4 border-emerald-50 shadow-md relative">
                  <img
                    src={leader.avatar}
                    alt={leader.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block">
                    {leader.title}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {leader.name}
                  </h4>
                  <p className="text-xs font-semibold text-emerald-700">
                    {leader.roleScope}
                  </p>
                </div>

                {/* Giới hạn độ dài bio tối đa 3 dòng để không làm dài thẻ gây mất nhiều không gian */}
                <p className="text-xs text-slate-600 leading-relaxed text-justify line-clamp-3">
                  {leader.bio}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{leader.campus}</span>
                  </div>
                  {leader.phone && (
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                      <span>{leader.phone}</span>
                    </div>
                  )}
                  {leader.email && (
                    <div className="flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{leader.email}</span>
                    </div>
                  )}
                </div>

                {/* Nút chỉ báo bấm xem chi tiết & phóng to */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-emerald-800">
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700/80">
                    <Maximize2 className="w-3 h-3 text-emerald-600" />
                    Phóng to xem đầy đủ
                  </span>
                  <span className="text-[11px] inline-flex items-center text-emerald-700 group-hover:text-emerald-900">
                    Chi tiết <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Teachers & Subject Specialists */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-emerald-700" />
            <h3 className="text-xl font-black text-slate-900">
              Đội Ngũ Giáo Viên Các Tổ Bộ Môn
            </h3>
          </div>

          {/* Grade Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {gradeOptions.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  selectedGrade === grade
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => setSelectedStaff({ type: 'teacher', data: teacher })}
              className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer"
            >
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCard({
                      sectionKey: 'teachers',
                      itemId: teacher.id,
                      title: teacher.name,
                      subtitle: teacher.role,
                      content: teacher.bio,
                      imageUrl: teacher.avatar,
                      extraField1Label: 'Bộ môn / Khối / Phụ trách',
                      extraField1Value: teacher.subjectOrGrade,
                      extraField2Label: 'Khối lớp / Phụ trách',
                      extraField2Value: teacher.campus,
                      extraField3Label: 'Danh hiệu & Thành tích (cách nhau dấu phẩy)',
                      extraField3Value: (teacher.achievements || []).join(', '),
                      extraField4Label: 'Trình độ chuyên môn',
                      extraField4Value: teacher.qualification || 'Cử nhân Sư phạm',
                    });
                  }}
                  className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-emerald-100 shadow-xs relative">
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {teacher.role}
                  </span>
                  <h4 className="font-bold text-base text-slate-900 mt-1 truncate group-hover:text-emerald-800 transition-colors">
                    {teacher.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-600 truncate">
                    {teacher.subjectOrGrade}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {teacher.campus}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {teacher.bio}
                </p>

                {teacher.achievements && teacher.achievements.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {teacher.achievements.slice(0, 2).map((ach, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium"
                      >
                        🏅 {ach}
                      </span>
                    ))}
                    {teacher.achievements.length > 2 && (
                      <span className="text-[10px] text-amber-800 font-bold self-center px-1">
                        +{teacher.achievements.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Nút chỉ báo bấm xem chi tiết & phóng to */}
                <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Maximize2 className="w-3 h-3 text-emerald-600" />
                    Phóng to xem đầy đủ
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center text-[11px]">
                    Chi tiết <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Staff Detail Modal (Phóng to xem đầy đủ nội dung & hình ảnh) */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative header banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-200">
                  {selectedStaff.type === 'principal'
                    ? 'Hồ Sơ Cán Bộ Quản Lý Nhà Trường'
                    : 'Hồ Sơ Giáo Viên Sư Phạm'}
                </span>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Large Portrait Image with zoom indicator */}
                <div className="relative group shrink-0">
                  <div
                    onClick={() => setIsPhotoZoomed(true)}
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-4 border-emerald-100 shadow-lg bg-slate-100 cursor-pointer"
                    title="Bấm để phóng to hình ảnh toàn màn hình"
                  >
                    <img
                      src={selectedStaff.data.avatar}
                      alt={selectedStaff.data.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <button
                    onClick={() => setIsPhotoZoomed(true)}
                    className="absolute -bottom-2 -right-2 bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-full shadow-md text-xs flex items-center gap-1 font-bold transition-transform hover:scale-110"
                    title="Bấm để phóng to hình ảnh cỡ lớn"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Staff Profile Meta */}
                <div className="flex-1 text-center sm:text-left space-y-2.5">
                  <div className="inline-flex items-center space-x-1.5 bg-emerald-100/80 text-emerald-900 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {selectedStaff.type === 'principal'
                        ? selectedStaff.data.title
                        : selectedStaff.data.role}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {selectedStaff.data.name}
                  </h3>

                  <p className="text-sm font-bold text-emerald-800">
                    {selectedStaff.type === 'principal'
                      ? selectedStaff.data.roleScope
                      : selectedStaff.data.subjectOrGrade}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                      {selectedStaff.data.campus}
                    </span>

                    {selectedStaff.type === 'teacher' && selectedStaff.data.qualification && (
                      <span className="inline-flex items-center bg-emerald-50 px-2.5 py-1 rounded-lg font-medium text-emerald-800">
                        <BookOpen className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        {selectedStaff.data.qualification}
                      </span>
                    )}

                    {selectedStaff.type === 'principal' && selectedStaff.data.phone && (
                      <span className="inline-flex items-center bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                        <Phone className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        {selectedStaff.data.phone}
                      </span>
                    )}

                    {selectedStaff.type === 'principal' && selectedStaff.data.email && (
                      <span className="inline-flex items-center bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                        <Mail className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        {selectedStaff.data.email}
                      </span>
                    )}
                  </div>

                  {/* Achievements badges */}
                  {selectedStaff.type === 'teacher' &&
                    selectedStaff.data.achievements &&
                    selectedStaff.data.achievements.length > 0 && (
                      <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-1.5">
                        {selectedStaff.data.achievements.map((ach, i) => (
                          <span
                            key={i}
                            className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            🏅 {ach}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {/* Full Bio Section (Xem đầy đủ 100% không bị cắt ngắn) */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Quá Trình Công Tác & Tâm Huyết Sư Phạm</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                  {selectedStaff.data.bio}
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      const payload =
                        selectedStaff.type === 'principal'
                          ? {
                              sectionKey: 'principals',
                              itemId: selectedStaff.data.id,
                              title: selectedStaff.data.name,
                              subtitle: selectedStaff.data.title,
                              content: selectedStaff.data.bio,
                              imageUrl: selectedStaff.data.avatar,
                              extraField1Label: 'Phân công nhiệm vụ',
                              extraField1Value: selectedStaff.data.roleScope,
                              extraField2Label: 'Phụ trách cơ sở',
                              extraField2Value: selectedStaff.data.campus,
                              extraField3Label: 'Số điện thoại liên hệ',
                              extraField3Value: selectedStaff.data.phone || '',
                              extraField4Label: 'Email công vụ',
                              extraField4Value: selectedStaff.data.email || '',
                            }
                          : {
                              sectionKey: 'teachers',
                              itemId: selectedStaff.data.id,
                              title: selectedStaff.data.name,
                              subtitle: selectedStaff.data.role,
                              content: selectedStaff.data.bio,
                              imageUrl: selectedStaff.data.avatar,
                              extraField1Label: 'Bộ môn / Khối / Phụ trách',
                              extraField1Value: selectedStaff.data.subjectOrGrade,
                              extraField2Label: 'Khối lớp / Phụ trách',
                              extraField2Value: selectedStaff.data.campus,
                              extraField3Label:
                                'Danh hiệu & Thành tích (cách nhau dấu phẩy)',
                              extraField3Value: (
                                selectedStaff.data.achievements || []
                              ).join(', '),
                              extraField4Label: 'Trình độ chuyên môn',
                              extraField4Value:
                                selectedStaff.data.qualification ||
                                'Cử nhân Sư phạm',
                            };
                      setSelectedStaff(null);
                      onEditCard(payload);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sửa Thông Tin Này (Admin)</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Trường Tiểu học Lê Lợi - Xã Pơng Drang, Tỉnh Đắk Lắk
                  </div>
                )}

                <button
                  onClick={() => setSelectedStaff(null)}
                  className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-2 rounded-xl text-xs transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Photo Lightbox */}
      {isPhotoZoomed && selectedStaff && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <button
            onClick={() => setIsPhotoZoomed(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="max-w-2xl max-h-[85vh] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedStaff.data.avatar}
              alt={selectedStaff.data.name}
              className="max-h-[70vh] w-auto object-contain rounded-2xl"
            />
            <div className="p-4 text-center">
              <h4 className="font-black text-lg text-slate-900">
                {selectedStaff.data.name}
              </h4>
              <p className="text-xs font-semibold text-emerald-700">
                {selectedStaff.type === 'principal'
                  ? selectedStaff.data.title + ' - ' + selectedStaff.data.roleScope
                  : selectedStaff.data.role + ' - ' + selectedStaff.data.subjectOrGrade}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
