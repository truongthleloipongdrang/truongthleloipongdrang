import React from 'react';
import {
  History,
  Target,
  Compass,
  Award,
  Building2,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Trees,
  Edit,
  MapPin,
} from 'lucide-react';
import { SiteContent, EditableCardPayload } from '../types';

interface AboutSectionProps {
  content: SiteContent;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  content,
  isAdmin,
  onEditCard,
}) => {
  return (
    <div className="space-y-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          VỀ CHÚNG TÔI
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          Giới Thiệu <span className="inline-block whitespace-nowrap">Trường Tiểu Học Lê Lợi</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Nơi hội tụ tình yêu thương, kỷ cương sư phạm và khát vọng vươn lên của
          con em các dân tộc anh em trên mảnh đất Pơng Drang, Đắk Lắk.
        </p>
      </div>

      {/* 2. History & Development */}
      <section className="relative group bg-white border border-emerald-100 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
        {isAdmin && (
          <button
            onClick={() =>
              onEditCard({
                sectionKey: 'history',
                title: content.historyTitle || 'Gần Ba Thập Kỷ Vượt Khó Ươm Mầm Con Chữ',
                subtitle: content.historyTag || 'Dấu Ấn Thời Gian & Trưởng Thành',
                content: content.history,
                imageUrl: content.historyImageUrl || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1000&q=80',
                imageCaption: content.historyImageCaption || 'Trường chính rợp bóng cây xanh tại Thôn Ea Tút, Pơng Drang',
                extraField1Label: 'Năm thành lập',
                extraField1Value: content.historyStat1Value || '1998',
                extraField2Label: 'Nhãn năm thành lập',
                extraField2Value: content.historyStat1Label || 'Năm thành lập',
                extraField3Label: 'Số điểm trường',
                extraField3Value: content.historyStat2Value || '03',
                extraField4Label: 'Nhãn điểm trường',
                extraField4Value: content.historyStat2Label || 'Điểm trường',
                extraField5Label: 'Mức chuẩn đạt được',
                extraField5Value: content.historyStat3Value || 'Mức Độ 1',
                extraField6Label: 'Nhãn chuẩn',
                extraField6Value: content.historyStat3Label || 'Chuẩn Quốc Gia',
              })
            }
            className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-sm flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Sửa thẻ lịch sử</span>
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
              <History className="w-4 h-4 text-emerald-700" />
              <span>{content.historyTag || 'Dấu Ấn Thời Gian & Trưởng Thành'}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">
              {content.historyTitle || 'Gần Ba Thập Kỷ Vượt Khó Ươm Mầm Con Chữ'}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed text-justify">
              {content.history}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <span className="block font-black text-xl text-emerald-800">
                  {content.historyStat1Value || '1998'}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {content.historyStat1Label || 'Năm thành lập'}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <span className="block font-black text-xl text-emerald-800">
                  {content.historyStat2Value || '03'}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {content.historyStat2Label || 'Điểm trường'}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <span className="block font-black text-xl text-amber-700">
                  {content.historyStat3Value || 'Mức Độ 1'}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {content.historyStat3Label || 'Chuẩn Quốc Gia'}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-emerald-100">
              <img
                src={content.historyImageUrl || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1000&q=80'}
                alt="Khuôn viên trường Tiểu học Lê Lợi"
                className="w-full h-72 object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-4 text-white">
                <p className="text-xs font-semibold">
                  {content.historyImageCaption || 'Trường chính rợp bóng cây xanh tại Thôn Ea Tút, Pơng Drang'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mission */}
        <div className="relative group bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'mission',
                  title: content.missionTitle || 'Sứ Mệnh Giáo Dục',
                  subtitle: 'Mục tiêu giáo dục',
                  content: content.mission,
                  extraField1Label: 'Khẩu hiệu chân thẻ',
                  extraField1Value: content.missionFooter || 'Tất cả vì học sinh thân yêu • Giáo dục bình đẳng và nhân văn',
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-sm flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ sứ mệnh</span>
            </button>
          )}

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-amber-300">
              {content.missionTitle || 'Sứ Mệnh Giáo Dục'}
            </h3>
            <p className="text-sm text-emerald-100 leading-relaxed">
              {content.mission}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-emerald-200 font-semibold">
            {content.missionFooter || 'Tất cả vì học sinh thân yêu • Giáo dục bình đẳng và nhân văn'}
          </div>
        </div>

        {/* Vision */}
        <div className="relative group bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'vision',
                  title: content.visionTitle || 'Tầm Nhìn Chiến Lược',
                  subtitle: 'Định hướng tương lai',
                  content: content.vision,
                  extraField1Label: 'Khẩu hiệu chân thẻ',
                  extraField1Value: content.visionFooter || 'Trường học chuẩn Quốc gia • Tiên phong giáo dục STEM & Số hóa',
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-sm flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ tầm nhìn</span>
            </button>
          )}

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-emerald-900">
              {content.visionTitle || 'Tầm Nhìn Chiến Lược'}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {content.vision}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-800 font-semibold">
            {content.visionFooter || 'Trường học chuẩn Quốc gia • Tiên phong giáo dục STEM & Số hóa'}
          </div>
        </div>
      </div>

      {/* 4. Core Values (4 Cards) */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
            KIM CHỈ NAM HÀNH ĐỘNG
          </span>
          <h3 className="text-2xl font-black text-slate-900">
            Giá Trị Cốt Lõi <span className="inline-block whitespace-nowrap">Trường Tiểu Học Lê Lợi</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {content.coreValues.map((val, idx) => (
            <div
              key={idx}
              className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'coreValues',
                      itemId: String(idx),
                      title: val.title,
                      content: val.desc,
                    })
                  }
                  className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
                >
                  Sửa thẻ này
                </button>
              )}

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  {idx === 0 && <HeartHandshake className="w-5 h-5" />}
                  {idx === 1 && <ShieldCheck className="w-5 h-5" />}
                  {idx === 2 && <Sparkles className="w-5 h-5" />}
                  {idx === 3 && <Trees className="w-5 h-5 text-emerald-600" />}
                </div>
                <h4 className="font-bold text-base text-slate-900">{val.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{val.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Facilities & Campuses (Main school + 2 branches) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-emerald-200 pb-3">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
              MÔI TRƯỜNG HỌC TẬP
            </span>
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-700" />
              Cơ Sở Vật Chất: Trường Chính & 2 Phân Hiệu
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Đảm bảo 100% học sinh học 2 buổi/ngày
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.facilities.map((fac, idx) => (
            <div
              key={idx}
              className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'facilities',
                      itemId: String(idx),
                      title: fac.title,
                      subtitle: fac.campus,
                      content: fac.desc,
                      imageUrl: fac.image,
                      extraField1Label: 'Điểm trường',
                      extraField1Value: fac.campus,
                    })
                  }
                  className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
                >
                  Sửa thẻ này
                </button>
              )}

              <div className="h-44 overflow-hidden relative">
                <img
                  src={fac.image}
                  alt={fac.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 bg-emerald-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-emerald-400" />
                  {fac.campus}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <h4 className="font-bold text-sm text-slate-900 leading-snug">
                  {fac.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {fac.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
