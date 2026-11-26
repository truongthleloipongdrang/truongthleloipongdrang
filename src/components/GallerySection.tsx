import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  X,
  FolderOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { GalleryAlbum, GalleryItem, EditableCardPayload } from '../types';
import { getGalleryCategoryLabel } from '../mediaHelpers';

interface GallerySectionProps {
  gallery: GalleryItem[];
  galleryAlbums?: GalleryAlbum[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  onOpenGalleryManager?: () => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  gallery,
  galleryAlbums = [],
  isAdmin,
  onEditCard,
  onOpenGalleryManager,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<{
    album: GalleryAlbum;
    photoIndex: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
        setSelectedAlbum(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = [
    { id: 'all', label: 'Tất Cả Hình Ảnh' },
    { id: 'hoat-dong', label: 'Hoạt Động Học Đường' },
    { id: 'co-so-vat-chat', label: 'Cơ Sở Vật Chất' },
    { id: 'su-kien', label: 'Sự Kiện & Lễ Hội' },
  ];

  const filtered =
    filter === 'all' ? gallery : gallery.filter((g) => g.category === filter);

  const filteredAlbums =
    filter === 'all'
      ? galleryAlbums
      : galleryAlbums.filter((a) => a.category === filter);

  const currentLightboxIndex = lightboxItem
    ? filtered.findIndex((item) => item.id === lightboxItem.id)
    : -1;

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          KHOẢNH KHẮC LÊ LỢI
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center justify-center gap-2">
          <ImageIcon className="w-8 h-8 text-emerald-700" />
          Thư Viện Ảnh Nhà Trường
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Ghi lại những nụ cười rạng rỡ của các em học sinh, sắc màu đại ngàn Tây
          Nguyên và diện mạo khang trang của ngôi trường theo năm tháng.
        </p>

        {isAdmin && onOpenGalleryManager && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenGalleryManager}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Quản Lý Thư Viện Ảnh & Album</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filter === c.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 2B. Photo Albums Section (only shown when albums exist) */}
      {filteredAlbums.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-700" />
              <span>Album Ảnh Sự Kiện ({filteredAlbums.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => setSelectedAlbum({ album, photoIndex: 0 })}
                className="group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="h-56 overflow-hidden relative bg-slate-100">
                  <img
                    src={album.coverImageUrl || album.photos[0]?.imageUrl}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs shadow">
                    <Layers className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{album.photos.length} ảnh</span>
                  </span>
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-bold bg-slate-900/80 px-3 py-1.5 rounded-full">
                      Mở album ảnh
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-emerald-800">
                      {getGalleryCategoryLabel(album.category)}
                    </span>
                    <span>{album.date}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {album.title}
                  </h3>
                  {album.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {album.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Photo Gallery Grid */}
      <div className="space-y-4">
        {filteredAlbums.length > 0 && filtered.length > 0 && (
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-700" />
            <span>Hình Ảnh Nổi Bật ({filtered.length})</span>
          </h2>
        )}

        {filtered.length === 0 && filteredAlbums.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl text-slate-500 text-sm">
            Chưa có hình ảnh nào trong danh mục này.
          </div>
        ) : (
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
                    className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow cursor-pointer"
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
                    <span className="font-semibold text-emerald-800">
                      {getGalleryCategoryLabel(item.category)}
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
        )}
      </div>

      {/* 4. Lightbox Modal for Standalone Photo */}
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
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              {filtered.length > 1 && currentLightboxIndex >= 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxItem(
                        filtered[(currentLightboxIndex - 1 + filtered.length) % filtered.length]
                      )
                    }
                    className="absolute left-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxItem(filtered[(currentLightboxIndex + 1) % filtered.length])
                    }
                    className="absolute right-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
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

      {/* 5. Album Viewer Modal */}
      {selectedAlbum && (
        <div
          onClick={() => setSelectedAlbum(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {(() => {
              const photos = selectedAlbum.album.photos;
              const current = photos[selectedAlbum.photoIndex];
              const activeSrc = current?.imageUrl || selectedAlbum.album.coverImageUrl;

              return (
                <>
                  <div className="relative h-[56vh] bg-black flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={activeSrc}
                      alt={current?.title || selectedAlbum.album.title}
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedAlbum(null)}
                      className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAlbum({
                              ...selectedAlbum,
                              photoIndex:
                                (selectedAlbum.photoIndex - 1 + photos.length) % photos.length,
                            })
                          }
                          className="absolute left-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAlbum({
                              ...selectedAlbum,
                              photoIndex: (selectedAlbum.photoIndex + 1) % photos.length,
                            })
                          }
                          className="absolute right-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-5 overflow-y-auto space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase">
                          {getGalleryCategoryLabel(selectedAlbum.album.category)} •{' '}
                          {selectedAlbum.album.date}
                        </span>
                        <h3 className="text-lg font-black text-slate-900">
                          {selectedAlbum.album.title}
                        </h3>
                      </div>
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
                        Ảnh {selectedAlbum.photoIndex + 1} / {Math.max(1, photos.length)}
                      </span>
                    </div>

                    {(current?.title || current?.caption || selectedAlbum.album.description) && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {current?.caption || current?.title || selectedAlbum.album.description}
                      </p>
                    )}

                    {photos.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                        {photos.map((photo, idx) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() =>
                              setSelectedAlbum({ ...selectedAlbum, photoIndex: idx })
                            }
                            className={`w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                              idx === selectedAlbum.photoIndex
                                ? 'border-emerald-600 ring-2 ring-emerald-200'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={photo.imageUrl}
                              alt={photo.title || `Ảnh ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

