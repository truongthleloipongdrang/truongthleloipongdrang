import React, { useState } from 'react';
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
} from 'lucide-react';
import { SiteContent, EditableCardPayload, Teacher, PrincipalLeader } from '../types';

interface StaffSectionProps {
  content: SiteContent;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const StaffSection: React.FC<StaffSectionProps> = ({
  content,
  isAdmin,
  onEditCard,
}) => {
  const [selectedCampus, setSelectedCampus] = useState<string>('Tất cả');

  const filteredTeachers =
    selectedCampus === 'Tất cả'
      ? content.teachers
      : content.teachers.filter(
          (t) => t.campus === selectedCampus || t.campus === 'Toàn trường'
        );

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
              className="relative group bg-white border border-emerald-100 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  onClick={() =>
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
                    })
                  }
                  className="absolute top-3 right-3 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <div className="space-y-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-2xl overflow-hidden border-4 border-emerald-50 shadow-md">
                  <img
                    src={leader.avatar}
                    alt={leader.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block">
                    {leader.title}
                  </span>
                  <h4 className="text-lg font-black text-slate-900">
                    {leader.name}
                  </h4>
                  <p className="text-xs font-semibold text-emerald-700">
                    {leader.roleScope}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed text-justify">
                  {leader.bio}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
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

          {/* Campus Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {['Tất cả', 'Trường chính', 'Phân hiệu 1', 'Phân hiệu 2'].map(
              (campus) => (
                <button
                  key={campus}
                  onClick={() => setSelectedCampus(campus)}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    selectedCampus === campus
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {campus}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'teachers',
                      itemId: teacher.id,
                      title: teacher.name,
                      subtitle: teacher.role,
                      content: teacher.bio,
                      imageUrl: teacher.avatar,
                      extraField1Label: 'Bộ môn / Khối / Phụ trách',
                      extraField1Value: teacher.subjectOrGrade,
                      extraField2Label: 'Điểm trường',
                      extraField2Value: teacher.campus,
                      extraField3Label: 'Danh hiệu & Thành tích (cách nhau dấu phẩy)',
                      extraField3Value: (teacher.achievements || []).join(', '),
                      extraField4Label: 'Trình độ chuyên môn',
                      extraField4Value: teacher.qualification || 'Cử nhân Sư phạm',
                    })
                  }
                  className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-emerald-100 shadow-xs">
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {teacher.role}
                  </span>
                  <h4 className="font-bold text-base text-slate-900 mt-1 truncate">
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
                    {teacher.achievements.map((ach, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium"
                      >
                        🏅 {ach}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
