import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Music,
  Flag,
  Compass,
  Monitor,
  Calendar,
  Edit,
  Trophy,
  X,
  ChevronRight,
  Maximize2,
  MapPin,
  School,
  CheckCircle2,
} from 'lucide-react';
import { ActivityItem, EditableCardPayload } from '../types';

interface ActivitiesSectionProps {
  activities: ActivityItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  onToggleHighlightActivity?: (actId: string) => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  activities,
  isAdmin,
  onEditCard,
  onToggleHighlightActivity,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedActivity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'day-hoc', label: 'Dạy Học & STEM', icon: BookOpen },
    { id: 'ngoai-khoa', label: 'Ngoại khoá', icon: Compass },
    { id: 'doi-tntp', label: 'Phong trào Đội', icon: Flag },
    { id: 'van-nghe', label: 'Văn nghệ', icon: Music },
    { id: 'the-thao', label: 'Thể thao', icon: Trophy },
    { id: 'trai-nghiem', label: 'Trải Nghiệm', icon: Sparkles },
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
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
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
            onClick={() => setSelectedActivity(act)}
            className={`relative group bg-white border rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer ${
              act.highlight
                ? 'border-amber-400 ring-2 ring-amber-300/50'
                : 'border-slate-200 hover:border-emerald-500'
            }`}
          >
            {isAdmin && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHighlightActivity?.(act.id);
                  }}
                  className={`font-black px-2.5 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1 transition-all cursor-pointer ${
                    act.highlight
                      ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-200'
                      : 'bg-white/95 text-slate-800 hover:bg-emerald-50'
                  }`}
                  title={
                    act.highlight
                      ? 'Hủy nổi bật hoạt động trên Trang Chủ'
                      : 'Làm nổi bật hoạt động trên Trang Chủ'
                  }
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{act.highlight ? 'Đang nổi bật' : 'Nổi bật'}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCard({
                      sectionKey: 'activities',
                      itemId: act.id,
                      title: act.title,
                      subtitle: act.categoryLabel,
                      content: act.description,
                      imageUrl: act.imageUrl,
                      category: act.category,
                      highlight: act.highlight,
                      extraField1Label: 'Lịch hoạt động',
                      extraField1Value: act.date,
                    });
                  }}
                  className="bg-slate-900 hover:bg-black text-white font-bold px-2.5 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1 cursor-pointer"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa</span>
                </button>
              </div>
            )}

            <div>
              <div className="h-52 overflow-hidden relative">
                <img
                  src={act.imageUrl}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Overlay hover badge */}
                <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="bg-slate-900/85 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phóng to xem đầy đủ</span>
                  </span>
                </div>

                {act.highlight && (
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Sparkles className="w-3 h-3" />
                    <span>TIÊU ĐIỂM TRANG CHỦ</span>
                  </span>
                )}
                <span className="absolute bottom-2.5 left-2.5 bg-emerald-900/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-xs">
                  {act.categoryLabel}
                </span>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span>{act.date}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {act.description}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0">
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Trường TH Lê Lợi</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold group-hover:text-emerald-900 transition-colors">
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Reader Modal for Enlarge Activity Details View */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="relative h-64 sm:h-80 overflow-hidden shrink-0 bg-slate-900">
              <img
                src={selectedActivity.imageUrl}
                alt={selectedActivity.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedActivity(null)}
                className="absolute top-4 right-4 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full transition-colors cursor-pointer shadow-lg z-10"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md">
                  {selectedActivity.categoryLabel}
                </span>
                {selectedActivity.highlight && (
                  <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tiêu Điểm Trang Chủ</span>
                  </span>
                )}
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
              <div className="flex flex-wrap items-center text-xs text-slate-500 gap-3 pb-2 border-b border-slate-100">
                <span className="flex items-center text-emerald-700 font-bold">
                  <Calendar className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Lịch hoạt động: {selectedActivity.date}
                </span>
                <span>•</span>
                <span className="flex items-center text-slate-600">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Trường Tiểu Học Lê Lợi - Xã Pơng Drang
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {selectedActivity.title}
              </h2>

              <div className="bg-emerald-50/80 border-l-4 border-emerald-600 p-4 sm:p-5 rounded-r-2xl space-y-1">
                <div className="text-[11px] uppercase font-black text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Nội dung & Mục tiêu hoạt động</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                  {selectedActivity.description}
                </p>
              </div>

              {selectedActivity.content && selectedActivity.content !== selectedActivity.description && (
                <div className="text-sm text-slate-800 leading-relaxed space-y-3 whitespace-pre-line pt-1">
                  {selectedActivity.content}
                </div>
              )}

              {/* Informative metadata cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-500">Đối tượng tham gia</div>
                  <div className="text-xs font-black text-slate-800 mt-1">Học sinh & Giáo viên trường</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-500">Địa bàn triển khai</div>
                  <div className="text-xs font-black text-slate-800 mt-1">Trường chính & các phân hiệu</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-500">Đơn vị chủ trì</div>
                  <div className="text-xs font-black text-slate-800 mt-1">Ban Giám Hiệu & Tổng Phụ Trách</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      const act = selectedActivity;
                      setSelectedActivity(null);
                      onEditCard({
                        sectionKey: 'activities',
                        itemId: act.id,
                        title: act.title,
                        subtitle: act.categoryLabel,
                        content: act.description,
                        imageUrl: act.imageUrl,
                        category: act.category,
                        highlight: act.highlight,
                        extraField1Label: 'Lịch hoạt động',
                        extraField1Value: act.date,
                      });
                    }}
                    className="bg-slate-900 hover:bg-black text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sửa hoạt động này</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
