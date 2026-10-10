import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Music,
  Flag,
  Compass,
  Monitor,
  Calendar,
  Edit,
  Filter,
} from 'lucide-react';
import { ActivityItem, EditableCardPayload } from '../types';

interface ActivitiesSectionProps {
  activities: ActivityItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  activities,
  isAdmin,
  onEditCard,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'day-hoc', label: 'Dạy Học & STEM', icon: BookOpen },
    { id: 'ngoai-khoa', label: 'Ngoại Khóa & Cồng Chiêng', icon: Music },
    { id: 'doi-tntp', label: 'Công Tác Đội', icon: Flag },
    { id: 'trai-nghiem', label: 'Trải Nghiệm', icon: Compass },
    { id: 'chuyen-doi-so', label: 'Chuyển Đổi Số', icon: Monitor },
  ];

  const filtered =
    filterCategory === 'all'
      ? activities
      : activities.filter((a) => a.category === filterCategory);

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          PHONG TRÀO THI ĐUA
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          Hoạt Động Giáo Dục & Trải Nghiệm Học Đường
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Đổi mới phương pháp dạy học, phát triển kỹ năng toàn diện, lan tỏa văn
          hóa bản sắc Tây Nguyên và tiên phong chuyển đổi số học đường.
        </p>
      </div>

      {/* 2. Category Filter Tabs */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((act) => (
          <div
            key={act.id}
            className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
          >
            {isAdmin && (
              <button
                onClick={() =>
                  onEditCard({
                    sectionKey: 'activities',
                    itemId: act.id,
                    title: act.title,
                    subtitle: act.categoryLabel,
                    content: act.description,
                    imageUrl: act.imageUrl,
                    category: act.category,
                    extraField1Label: 'Lịch hoạt động',
                    extraField1Value: act.date,
                  })
                }
                className="absolute top-3 right-3 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow"
              >
                Sửa thẻ này
              </button>
            )}

            <div>
              <div className="h-52 overflow-hidden relative">
                <img
                  src={act.imageUrl}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2.5 left-2.5 bg-emerald-900/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-xs">
                  {act.categoryLabel}
                </span>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span>{act.date}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 leading-snug">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0">
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Trường Tiểu Học Lê Lợi</span>
                <span>Xã Pơng Drang - Đắk Lắk</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
