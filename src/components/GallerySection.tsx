import React, { useState } from 'react';
import { Image as ImageIcon, Filter, X, Calendar, Edit } from 'lucide-react';
import { GalleryItem, EditableCardPayload } from '../types';

interface GallerySectionProps {
  gallery: GalleryItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  gallery,
  isAdmin,
  onEditCard,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const categories = [
    { id: 'all', label: 'Tất Cả Hình Ảnh' },
    { id: 'hoat-dong', label: 'Hoạt Động Học Đường' },
    { id: 'co-so-vat-chat', label: 'Cơ Sở Vật Chất' },
    { id: 'su-kien', label: 'Sự Kiện & Lễ Hội' },
  ];

  const filtered =
    filter === 'all' ? gallery : gallery.filter((g) => g.category === filter);

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          KHOẢNH KHẮC LÊ LỢI
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center justify-center gap-2">
          <ImageIcon className="w-8 h-8 text-emerald-700" />
          Thư Viện Ảnh Nhà Trường
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Ghi lại những nụ cười rạng rỡ của các em học sinh, sắc màu đại ngàn Tây
          Nguyên và diện mạo khang trang của ngôi trường theo năm tháng.
        </p>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              filter === c.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 3. Photo Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
          >
            {isAdmin && (
              <button
                onClick={() =>
                  onEditCard({
                    sectionKey: 'gallery',
                    itemId: item.id,
                    title: item.title,
                    content: item.caption,
                    imageUrl: item.imageUrl,
                    category: item.category,
                    extraField1Label: 'Thời gian',
                    extraField1Value: item.date,
                  })
                }
                className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
              >
                Sửa thẻ này
              </button>
            )}

            <div
              onClick={() => setLightboxItem(item)}
              className="h-60 overflow-hidden relative cursor-pointer"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-bold bg-slate-900/70 px-3 py-1.5 rounded-full">
                  🔍 Phóng to ảnh
                </span>
              </div>
            </div>

            <div className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="capitalize font-semibold text-emerald-800">
                  {item.category.replace(/-/g, ' ')}
                </span>
                <span>{item.date}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                {item.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {item.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Lightbox Modal */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-3"
          >
            <div className="relative max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="max-h-[70vh] w-auto object-contain mx-auto"
              />
              <button
                onClick={() => setLightboxItem(null)}
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900">
                {lightboxItem.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {lightboxItem.caption}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
                <span>Trường Tiểu Học Lê Lợi - Xã Pơng Drang, Đắk Lắk</span>
                <span>Thời gian: {lightboxItem.date}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
