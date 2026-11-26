import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Save,
  Download,
  Image as ImageIcon,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  Star,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import type { GalleryAlbum, GalleryAlbumPhoto, GalleryItem } from '../types';
import {
  GALLERY_CATEGORIES,
  getGalleryCategoryLabel,
  moveArrayItem,
  parseMultipleImageUrls,
  validateHttpsImageUrl,
} from '../mediaHelpers';
import { ImageUrlPreview } from './ImageUrlPreview';

interface AdminGalleryManagerProps {
  isAdmin: boolean;
  gallery: GalleryItem[];
  albums: GalleryAlbum[];
  savingOnline: boolean;
  isFirebaseOnline: boolean;
  hasUnsavedChanges?: boolean;
  onChangeGallery: (nextGallery: GalleryItem[]) => void;
  onChangeAlbums: (nextAlbums: GalleryAlbum[]) => void;
  onSaveToFirebase: () => void;
  onBackupCurrentContent: () => void;
}

type ConfirmDeleteState =
  | { kind: 'photo'; item: GalleryItem }
  | { kind: 'album'; album: GalleryAlbum }
  | { kind: 'albumPhoto'; albumId: string; photo: GalleryAlbumPhoto };

type PreviewState =
  | { kind: 'photo'; item: GalleryItem }
  | { kind: 'album'; album: GalleryAlbum; photoIndex: number };

const todayLabel = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const AdminGalleryManager: React.FC<AdminGalleryManagerProps> = ({
  isAdmin,
  gallery,
  albums,
  savingOnline,
  isFirebaseOnline,
  hasUnsavedChanges = false,
  onChangeGallery,
  onChangeAlbums,
  onSaveToFirebase,
  onBackupCurrentContent,
}) => {
  if (!isAdmin) return null;

  const [subTab, setSubTab] = useState<'photos' | 'albums'>('photos');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [localMsg, setLocalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo Add/Edit Modal state
  const [photoFormOpen, setPhotoFormOpen] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoDate, setPhotoDate] = useState(todayLabel());
  const [photoCategory, setPhotoCategory] = useState<string>('hoat-dong');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUrlLoadStatus, setPhotoUrlLoadStatus] = useState<string>('empty');
  const [photoFormError, setPhotoFormError] = useState('');

  // Album Add/Edit Modal state
  const [albumFormOpen, setAlbumFormOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDate, setAlbumDate] = useState(todayLabel());
  const [albumCategory, setAlbumCategory] = useState<string>('hoat-dong');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [albumInitialPhotosText, setAlbumInitialPhotosText] = useState('');
  const [albumFormError, setAlbumFormError] = useState('');

  // Selected Album Detail view (for adding/reordering/deleting photos inside an album)
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [bulkAlbumUrls, setBulkAlbumUrls] = useState('');
  const [singleAlbumPhotoUrl, setSingleAlbumPhotoUrl] = useState('');
  const [singleAlbumPhotoTitle, setSingleAlbumPhotoTitle] = useState('');
  const [singleAlbumPhotoCaption, setSingleAlbumPhotoCaption] = useState('');
  const [albumPhotosError, setAlbumPhotosError] = useState('');

  // Delete confirmation & preview modals
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  const activeAlbum = activeAlbumId ? albums.find((a) => a.id === activeAlbumId) || null : null;

  const showNotice = (type: 'success' | 'error', text: string) => {
    setLocalMsg({ type, text });
    window.setTimeout(() => {
      setLocalMsg((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  // ---------------- STANDALONE PHOTO HANDLERS ----------------
  const openAddPhotoForm = () => {
    setEditingPhotoId(null);
    setPhotoTitle('');
    setPhotoDate(todayLabel());
    setPhotoCategory('hoat-dong');
    setPhotoCaption('');
    setPhotoUrl('');
    setPhotoUrlLoadStatus('empty');
    setPhotoFormError('');
    setPhotoFormOpen(true);
  };

  const openEditPhotoForm = (item: GalleryItem) => {
    setEditingPhotoId(item.id);
    setPhotoTitle(item.title);
    setPhotoDate(item.date || todayLabel());
    setPhotoCategory(item.category || 'hoat-dong');
    setPhotoCaption(item.caption || '');
    setPhotoUrl(item.imageUrl || '');
    setPhotoFormError('');
    setPhotoFormOpen(true);
  };

  const handleSubmitPhotoForm = (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoFormError('');

    const title = photoTitle.trim();
    const caption = photoCaption.trim();
    const date = photoDate.trim() || todayLabel();

    if (title.length < 2) {
      setPhotoFormError('Vui lòng nhập tiêu đề ảnh (ít nhất 2 ký tự).');
      return;
    }

    const urlCheck = validateHttpsImageUrl(photoUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      setPhotoFormError(urlCheck.error || 'URL ảnh HTTPS không hợp lệ.');
      return;
    }

    if (photoUrlLoadStatus === 'error') {
      setPhotoFormError(
        'Ảnh không tải được từ URL này. Vui lòng kiểm tra lại liên kết ImageKit.io trước khi lưu.'
      );
      return;
    }

    if (editingPhotoId) {
      const updated = gallery.map((item) =>
        item.id === editingPhotoId
          ? {
              ...item,
              title,
              date,
              category: photoCategory,
              caption,
              imageUrl: urlCheck.normalizedUrl!,
            }
          : item
      );
      onChangeGallery(updated);
      showNotice(
        'success',
        `Đã cập nhật ảnh "${title}". Bấm "Lưu lên Firebase" để xuất bản lên website.`
      );
    } else {
      const newItem: GalleryItem = {
        id: `gal-${Date.now()}`,
        title,
        date,
        category: photoCategory,
        caption,
        imageUrl: urlCheck.normalizedUrl,
        order: 0,
      };
      onChangeGallery([newItem, ...gallery]);
      showNotice(
        'success',
        `Đã thêm ảnh mới "${title}". Bấm "Lưu lên Firebase" để xuất bản lên website.`
      );
    }
    setPhotoFormOpen(false);
  };

  const handleReorderPhoto = (id: string, direction: 'up' | 'down' | 'top') => {
    const idx = gallery.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const reordered = moveArrayItem(gallery, idx, direction).map((item, i) => ({
      ...item,
      order: i + 1,
    }));
    onChangeGallery(reordered);
  };

  // ---------------- ALBUM HANDLERS ----------------
  const openAddAlbumForm = () => {
    setEditingAlbumId(null);
    setAlbumTitle('');
    setAlbumDate(todayLabel());
    setAlbumCategory('hoat-dong');
    setAlbumDescription('');
    setAlbumCoverUrl('');
    setAlbumInitialPhotosText('');
    setAlbumFormError('');
    setAlbumFormOpen(true);
  };

  const openEditAlbumForm = (album: GalleryAlbum) => {
    setEditingAlbumId(album.id);
    setAlbumTitle(album.title);
    setAlbumDate(album.date || todayLabel());
    setAlbumCategory(album.category || 'hoat-dong');
    setAlbumDescription(album.description || '');
    setAlbumCoverUrl(album.coverImageUrl || '');
    setAlbumInitialPhotosText('');
    setAlbumFormError('');
    setAlbumFormOpen(true);
  };

  const handleSubmitAlbumForm = (e: React.FormEvent) => {
    e.preventDefault();
    setAlbumFormError('');

    const title = albumTitle.trim();
    const description = albumDescription.trim();
    const date = albumDate.trim() || todayLabel();

    if (title.length < 2) {
      setAlbumFormError('Vui lòng nhập tên album (ít nhất 2 ký tự).');
      return;
    }

    let initialPhotos: GalleryAlbumPhoto[] = [];
    if (!editingAlbumId && albumInitialPhotosText.trim()) {
      const parsed = parseMultipleImageUrls(albumInitialPhotosText);
      if (parsed.invalidLines.length > 0) {
        setAlbumFormError(
          `Có ${parsed.invalidLines.length} URL không hợp lệ (chỉ chấp nhận HTTPS): "${parsed.invalidLines[0].line}"`
        );
        return;
      }
      initialPhotos = parsed.validUrls.map((url, idx) => ({
        id: `ap-${Date.now()}-${idx}`,
        imageUrl: url,
        title: `${title} - Ảnh ${idx + 1}`,
        caption: '',
        date,
        order: idx + 1,
      }));
    }

    const coverCandidate = albumCoverUrl.trim() || initialPhotos[0]?.imageUrl || '';
    const coverCheck = validateHttpsImageUrl(coverCandidate);
    if (!coverCheck.valid || !coverCheck.normalizedUrl) {
      setAlbumFormError(
        coverCheck.error || 'Vui lòng dán URL ảnh đại diện HTTPS (từ ImageKit.io) cho album.'
      );
      return;
    }

    if (editingAlbumId) {
      const updated = albums.map((a) =>
        a.id === editingAlbumId
          ? {
              ...a,
              title,
              date,
              category: albumCategory,
              description,
              coverImageUrl: coverCheck.normalizedUrl!,
            }
          : a
      );
      onChangeAlbums(updated);
      showNotice(
        'success',
        `Đã cập nhật thông tin album "${title}". Bấm "Lưu lên Firebase" để xuất bản.`
      );
    } else {
      const photosToSave: GalleryAlbumPhoto[] =
        initialPhotos.length > 0
          ? initialPhotos
          : [
              {
                id: `ap-${Date.now()}-0`,
                imageUrl: coverCheck.normalizedUrl,
                title,
                caption: description,
                date,
                order: 1,
              },
            ];
      const newAlbum: GalleryAlbum = {
        id: `alb-${Date.now()}`,
        title,
        date,
        category: albumCategory,
        description,
        coverImageUrl: coverCheck.normalizedUrl,
        photos: photosToSave,
        order: 0,
      };
      onChangeAlbums([newAlbum, ...albums]);
      setActiveAlbumId(newAlbum.id);
      showNotice(
        'success',
        `Đã tạo album "${title}" (${photosToSave.length} ảnh). Bấm "Lưu lên Firebase" để xuất bản.`
      );
    }

    setAlbumFormOpen(false);
  };

  const handleReorderAlbum = (albumId: string, direction: 'up' | 'down' | 'top') => {
    const idx = albums.findIndex((a) => a.id === albumId);
    if (idx === -1) return;
    const reordered = moveArrayItem(albums, idx, direction).map((item, i) => ({
      ...item,
      order: i + 1,
    }));
    onChangeAlbums(reordered);
  };

  const handleAddSinglePhotoToAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlbum) return;
    setAlbumPhotosError('');

    const check = validateHttpsImageUrl(singleAlbumPhotoUrl);
    if (!check.valid || !check.normalizedUrl) {
      setAlbumPhotosError(check.error || 'URL ảnh HTTPS không hợp lệ.');
      return;
    }

    const newPhoto: GalleryAlbumPhoto = {
      id: `ap-${Date.now()}`,
      imageUrl: check.normalizedUrl,
      title: singleAlbumPhotoTitle.trim() || `${activeAlbum.title} - Ảnh ${activeAlbum.photos.length + 1}`,
      caption: singleAlbumPhotoCaption.trim(),
      date: activeAlbum.date || todayLabel(),
      order: activeAlbum.photos.length + 1,
    };

    const updatedAlbums = albums.map((a) =>
      a.id === activeAlbum.id
        ? {
            ...a,
            coverImageUrl: a.coverImageUrl || newPhoto.imageUrl,
            photos: [...a.photos, newPhoto],
          }
        : a
    );
    onChangeAlbums(updatedAlbums);
    setSingleAlbumPhotoUrl('');
    setSingleAlbumPhotoTitle('');
    setSingleAlbumPhotoCaption('');
    showNotice('success', `Đã thêm 1 ảnh vào album "${activeAlbum.title}".`);
  };

  const handleAddBulkPhotosToAlbum = () => {
    if (!activeAlbum) return;
    setAlbumPhotosError('');

    if (!bulkAlbumUrls.trim()) {
      setAlbumPhotosError('Vui lòng dán ít nhất 1 URL ảnh HTTPS từ ImageKit.io (mỗi dòng 1 link).');
      return;
    }

    const parsed = parseMultipleImageUrls(bulkAlbumUrls);
    if (parsed.invalidLines.length > 0) {
      setAlbumPhotosError(
        `Phát hiện ${parsed.invalidLines.length} dòng không hợp lệ (chỉ chấp nhận HTTPS): "${parsed.invalidLines[0].line}" — ${parsed.invalidLines[0].error}`
      );
      return;
    }

    if (parsed.validUrls.length === 0) {
      setAlbumPhotosError('Không có URL hợp lệ nào để thêm.');
      return;
    }

    const baseCount = activeAlbum.photos.length;
    const newPhotos: GalleryAlbumPhoto[] = parsed.validUrls.map((url, idx) => ({
      id: `ap-${Date.now()}-${idx}`,
      imageUrl: url,
      title: `${activeAlbum.title} - Ảnh ${baseCount + idx + 1}`,
      caption: '',
      date: activeAlbum.date || todayLabel(),
      order: baseCount + idx + 1,
    }));

    const updatedAlbums = albums.map((a) =>
      a.id === activeAlbum.id
        ? {
            ...a,
            coverImageUrl: a.coverImageUrl || newPhotos[0].imageUrl,
            photos: [...a.photos, ...newPhotos],
          }
        : a
    );
    onChangeAlbums(updatedAlbums);
    setBulkAlbumUrls('');
    showNotice(
      'success',
      `Đã thêm nhanh ${newPhotos.length} ảnh vào album "${activeAlbum.title}". Bấm "Lưu lên Firebase" để xuất bản.`
    );
  };

  const handleSetAlbumCover = (albumId: string, imageUrl: string) => {
    const updated = albums.map((a) =>
      a.id === albumId ? { ...a, coverImageUrl: imageUrl } : a
    );
    onChangeAlbums(updated);
    showNotice('success', 'Đã đổi ảnh đại diện của album thành công.');
  };

  const handleReorderAlbumPhoto = (
    albumId: string,
    photoId: string,
    direction: 'up' | 'down' | 'top'
  ) => {
    const updated = albums.map((a) => {
      if (a.id !== albumId) return a;
      const idx = a.photos.findIndex((p) => p.id === photoId);
      if (idx === -1) return a;
      const reordered = moveArrayItem(a.photos, idx, direction).map((p, i) => ({
        ...p,
        order: i + 1,
      }));
      return { ...a, photos: reordered };
    });
    onChangeAlbums(updated);
  };

  const handleUpdateAlbumPhotoCaption = (
    albumId: string,
    photoId: string,
    field: 'title' | 'caption',
    value: string
  ) => {
    const updated = albums.map((a) => {
      if (a.id !== albumId) return a;
      return {
        ...a,
        photos: a.photos.map((p) => (p.id === photoId ? { ...p, [field]: value } : p)),
      };
    });
    onChangeAlbums(updated);
  };

  // ---------------- DELETE CONFIRMATION ----------------
  const executeConfirmedDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'photo') {
      onChangeGallery(gallery.filter((g) => g.id !== confirmDelete.item.id));
      showNotice(
        'success',
        `Đã xóa ảnh "${confirmDelete.item.title}". Bấm "Lưu lên Firebase" để cập nhật website.`
      );
    } else if (confirmDelete.kind === 'album') {
      onChangeAlbums(albums.filter((a) => a.id !== confirmDelete.album.id));
      if (activeAlbumId === confirmDelete.album.id) {
        setActiveAlbumId(null);
      }
      showNotice(
        'success',
        `Đã xóa album "${confirmDelete.album.title}". Bấm "Lưu lên Firebase" để cập nhật website.`
      );
    } else if (confirmDelete.kind === 'albumPhoto') {
      const updated = albums.map((a) => {
        if (a.id !== confirmDelete.albumId) return a;
        const remaining = a.photos.filter((p) => p.id !== confirmDelete.photo.id);
        const nextCover =
          a.coverImageUrl === confirmDelete.photo.imageUrl && remaining.length > 0
            ? remaining[0].imageUrl
            : a.coverImageUrl;
        return { ...a, coverImageUrl: nextCover, photos: remaining };
      });
      onChangeAlbums(updated);
      showNotice('success', 'Đã xóa ảnh khỏi album.');
    }
    setConfirmDelete(null);
  };

  const filteredPhotos =
    filterCategory === 'all' ? gallery : gallery.filter((g) => g.category === filterCategory);

  const filteredAlbums =
    filterCategory === 'all' ? albums : albums.filter((a) => a.category === filterCategory);

  return (
    <div className="space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-700" />
            <span>Quản Lý Thư Viện Ảnh & Album (ImageKit.io)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dán trực tiếp URL HTTPS từ <strong>ImageKit.io</strong> — lưu gọn nhẹ vào{' '}
            <code className="bg-slate-100 px-1 rounded">siteData/publicContent</code> trên Firebase Spark miễn phí.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={subTab === 'photos' ? openAddPhotoForm : openAddAlbumForm}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{subTab === 'photos' ? 'Thêm ảnh mới' : 'Thêm album mới'}</span>
          </button>

          <button
            type="button"
            onClick={onBackupCurrentContent}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
            title="Sao lưu toàn bộ nội dung công khai hiện tại thành file JSON trước khi chỉnh sửa"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sao lưu JSON</span>
          </button>

          <button
            type="button"
            onClick={onSaveToFirebase}
            disabled={savingOnline}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 ${
              hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300'
                : 'bg-slate-900 hover:bg-black text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {savingOnline
                ? 'Đang lưu...'
                : isFirebaseOnline
                ? 'Lưu lên Firebase'
                : 'Lưu thay đổi'}
            </span>
          </button>
        </div>
      </div>

      {/* Inline status alert */}
      {localMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            localMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {localMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {localMsg.text}
          </span>
          <button
            type="button"
            onClick={() => setLocalMsg(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-tabs & Category filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setSubTab('photos');
              setActiveAlbumId(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'photos'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ảnh Thư Viện ({gallery.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('albums')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'albums'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Album Ảnh ({albums.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg border cursor-pointer whitespace-nowrap ${
              filterCategory === 'all'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </button>
          {GALLERY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= SUB-TAB 1: STANDALONE PHOTOS ================= */}
      {subTab === 'photos' && (
        <div className="space-y-3">
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Chưa có hình ảnh nào trong danh mục này.
              </p>
              <button
                type="button"
                onClick={openAddPhotoForm}
                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm ảnh đầu tiên bằng URL ImageKit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPhotos.map((item) => {
                const realIdx = gallery.findIndex((g) => g.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-emerald-300 transition-colors"
                  >
                    <div
                      onClick={() => setPreviewState({ kind: 'photo', item })}
                      className="w-full sm:w-32 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-slate-900/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{realIdx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          {getGalleryCategoryLabel(item.category)}
                        </span>
                        <span className="text-slate-400 font-medium">{item.date}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.caption}</p>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {item.imageUrl}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Order Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleReorderPhoto(item.id, 'top')}
                          disabled={realIdx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Đưa lên đầu danh sách"
                        >
                          <ChevronsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderPhoto(item.id, 'up')}
                          disabled={realIdx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderPhoto(item.id, 'down')}
                          disabled={realIdx === gallery.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* CRUD Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewState({ kind: 'photo', item })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPhotoForm(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ kind: 'photo', item })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: ALBUMS ================= */}
      {subTab === 'albums' && !activeAlbum && (
        <div className="space-y-3">
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Chưa có album ảnh nào. Bạn có thể gom nhiều ảnh theo từng sự kiện vào một album.
              </p>
              <button
                type="button"
                onClick={openAddAlbumForm}
                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo album ảnh đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredAlbums.map((album) => {
                const realIdx = albums.findIndex((a) => a.id === album.id);
                return (
                  <div
                    key={album.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-emerald-300 transition-colors"
                  >
                    <div
                      onClick={() => setActiveAlbumId(album.id)}
                      className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group"
                    >
                      <img
                        src={album.coverImageUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Album #{realIdx + 1}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 bg-emerald-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {album.photos.length} ảnh
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          {getGalleryCategoryLabel(album.category)}
                        </span>
                        <span className="text-slate-400 font-medium">{album.date}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{album.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{album.description}</p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleReorderAlbum(album.id, 'top')}
                          disabled={realIdx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Đưa album lên đầu"
                        >
                          <ChevronsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderAlbum(album.id, 'up')}
                          disabled={realIdx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Chuyển album lên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderAlbum(album.id, 'down')}
                          disabled={realIdx === albums.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                          title="Chuyển album xuống"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveAlbumId(album.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Quản lý ảnh ({album.photos.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewState({ kind: 'album', album, photoIndex: 0 })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAlbumForm(album)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ kind: 'album', album })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= ALBUM DETAIL VIEW (MANAGE PHOTOS INSIDE ALBUM) ================= */}
      {subTab === 'albums' && activeAlbum && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveAlbumId(null);
                  setAlbumPhotosError('');
                }}
                className="p-2 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 cursor-pointer shrink-0"
                title="Quay lại danh sách album"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <img
                src={activeAlbum.coverImageUrl}
                alt={activeAlbum.title}
                className="w-14 h-14 rounded-xl object-cover border border-emerald-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">
                  Đang quản lý ảnh trong album • {activeAlbum.photos.length} ảnh
                </div>
                <h4 className="font-black text-slate-900 text-sm truncate">{activeAlbum.title}</h4>
                <p className="text-xs text-slate-600 truncate">{activeAlbum.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewState({ kind: 'album', album: activeAlbum, photoIndex: 0 })}
                className="inline-flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Xem trước album
              </button>
              <button
                type="button"
                onClick={() => openEditAlbumForm(activeAlbum)}
                className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Sửa thông tin album
              </button>
            </div>
          </div>

          {albumPhotosError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{albumPhotosError}</span>
            </div>
          )}

          {/* Two ways to add photos into album: Single photo with caption OR Bulk paste multiple ImageKit URLs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bulk add multiple URLs */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-slate-800">
                Thêm nhiều ảnh cùng lúc vào album (mỗi dòng 1 URL ImageKit HTTPS)
              </div>
              <textarea
                rows={4}
                placeholder={'https://ik.imagekit.io/your_id/anh-1.jpg\nhttps://ik.imagekit.io/your_id/anh-2.jpg\nhttps://ik.imagekit.io/your_id/anh-3.jpg'}
                value={bulkAlbumUrls}
                onChange={(e) => {
                  setBulkAlbumUrls(e.target.value);
                  setAlbumPhotosError('');
                }}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddBulkPhotosToAlbum}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm hàng loạt vào album
              </button>
            </div>

            {/* Add single photo with preview */}
            <form
              onSubmit={handleAddSinglePhotoToAlbum}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5"
            >
              <div className="text-xs font-bold text-slate-800">
                Hoặc thêm từng ảnh kèm tiêu đề & mô tả riêng
              </div>
              <input
                type="url"
                placeholder="Dán URL HTTPS từ ImageKit.io..."
                value={singleAlbumPhotoUrl}
                onChange={(e) => {
                  setSingleAlbumPhotoUrl(e.target.value);
                  setAlbumPhotosError('');
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Tiêu đề ảnh (tùy chọn)"
                  value={singleAlbumPhotoTitle}
                  onChange={(e) => setSingleAlbumPhotoTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Mô tả ngắn (tùy chọn)"
                  value={singleAlbumPhotoCaption}
                  onChange={(e) => setSingleAlbumPhotoCaption(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              {singleAlbumPhotoUrl.trim() && (
                <ImageUrlPreview url={singleAlbumPhotoUrl} aspectClass="h-24" compact />
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm ảnh này vào album
              </button>
            </form>
          </div>

          {/* Photos inside this album */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase">
              Danh sách ảnh trong album ({activeAlbum.photos.length})
            </div>
            {activeAlbum.photos.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed">
                Album chưa có ảnh nào. Hãy dán URL ảnh ImageKit.io ở khung phía trên để thêm ảnh.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeAlbum.photos.map((photo, idx) => {
                  const isCover = activeAlbum.coverImageUrl === photo.imageUrl;
                  return (
                    <div
                      key={photo.id}
                      className={`bg-white border rounded-2xl p-3 flex gap-3 items-start ${
                        isCover ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 border shrink-0 relative">
                        <img
                          src={photo.imageUrl}
                          alt={photo.title || `Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 bg-slate-900/75 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          type="text"
                          value={photo.title || ''}
                          placeholder="Tiêu đề ảnh..."
                          onChange={(e) =>
                            handleUpdateAlbumPhotoCaption(activeAlbum.id, photo.id, 'title', e.target.value)
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900"
                        />
                        <input
                          type="text"
                          value={photo.caption || ''}
                          placeholder="Mô tả ảnh..."
                          onChange={(e) =>
                            handleUpdateAlbumPhotoCaption(activeAlbum.id, photo.id, 'caption', e.target.value)
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-600"
                        />
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleSetAlbumCover(activeAlbum.id, photo.imageUrl)}
                            disabled={isCover}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              isCover
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            <span>{isCover ? 'Ảnh đại diện' : 'Đặt làm ảnh đại diện'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReorderAlbumPhoto(activeAlbum.id, photo.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                            title="Lên"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorderAlbumPhoto(activeAlbum.id, photo.id, 'down')}
                            disabled={idx === activeAlbum.photos.length - 1}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                            title="Xuống"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                kind: 'albumPhoto',
                                albumId: activeAlbum.id,
                                photo,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT STANDALONE PHOTO MODAL ================= */}
      {photoFormOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3"
          onClick={() => setPhotoFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">
                {editingPhotoId ? 'Chỉnh Sửa Hình Ảnh Thư Viện' : 'Thêm Ảnh Mới Từ ImageKit.io'}
              </h4>
              <button
                type="button"
                onClick={() => setPhotoFormOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPhotoForm} className="p-5 space-y-4">
              {photoFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {photoFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề ảnh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lễ khai giảng năm học 2026 - 2027"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày đăng / ngày chụp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 05/09/2026"
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Danh mục *
                  </label>
                  <select
                    value={photoCategory}
                    onChange={(e) => setPhotoCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  URL hình ảnh từ ImageKit.io (bắt buộc HTTPS) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://ik.imagekit.io/..."
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    setPhotoFormError('');
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ảnh xem trước tự động
                </label>
                <ImageUrlPreview
                  url={photoUrl}
                  alt={photoTitle || 'Xem trước ảnh'}
                  aspectClass="h-48"
                  onStatusChange={setPhotoUrlLoadStatus}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung mô tả
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả khoảnh khắc, địa điểm hoặc sự kiện trong ảnh..."
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPhotoFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  {editingPhotoId ? 'Cập nhật ảnh' : 'Thêm ảnh vào thư viện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT ALBUM MODAL ================= */}
      {albumFormOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3"
          onClick={() => setAlbumFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">
                {editingAlbumId ? 'Chỉnh Sửa Thông Tin Album Ảnh' : 'Tạo Album Ảnh Mới'}
              </h4>
              <button
                type="button"
                onClick={() => setAlbumFormOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAlbumForm} className="p-5 space-y-4">
              {albumFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {albumFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên album *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hội diễn Văn nghệ Chào mừng 20/11"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày đăng / ngày chụp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 20/11/2026"
                    value={albumDate}
                    onChange={(e) => setAlbumDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Danh mục *
                  </label>
                  <select
                    value={albumCategory}
                    onChange={(e) => setAlbumCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung mô tả album
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả nội dung chính của album ảnh..."
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  URL ảnh đại diện album (ImageKit.io HTTPS) *
                </label>
                <input
                  type="url"
                  placeholder="https://ik.imagekit.io/... (hoặc để trống sẽ tự lấy ảnh đầu tiên bên dưới)"
                  value={albumCoverUrl}
                  onChange={(e) => {
                    setAlbumCoverUrl(e.target.value);
                    setAlbumFormError('');
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <ImageUrlPreview
                url={albumCoverUrl}
                alt={albumTitle || 'Ảnh đại diện album'}
                aspectClass="h-40"
              />

              {!editingAlbumId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Danh sách URL ảnh ban đầu trong album (tùy chọn — mỗi dòng 1 URL ImageKit HTTPS)
                  </label>
                  <textarea
                    rows={4}
                    placeholder={'https://ik.imagekit.io/your_id/anh-1.jpg\nhttps://ik.imagekit.io/your_id/anh-2.jpg'}
                    value={albumInitialPhotosText}
                    onChange={(e) => setAlbumInitialPhotosText(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAlbumFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  {editingAlbumId ? 'Cập nhật album' : 'Tạo album ảnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE DIALOG ================= */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Xác nhận xóa</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDelete.kind === 'photo' && (
                    <>
                      Bạn có chắc chắn muốn xóa hình ảnh <strong>"{confirmDelete.item.title}"</strong> khỏi Thư Viện Ảnh không?
                    </>
                  )}
                  {confirmDelete.kind === 'album' && (
                    <>
                      Bạn có chắc chắn muốn xóa toàn bộ album <strong>"{confirmDelete.album.title}"</strong> ({confirmDelete.album.photos.length} ảnh) không?
                    </>
                  )}
                  {confirmDelete.kind === 'albumPhoto' && (
                    <>
                      Bạn có chắc chắn muốn xóa ảnh <strong>"{confirmDelete.photo.title || 'này'}"</strong> khỏi album không?
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewState && (
        <div
          className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewState(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewState.kind === 'photo' ? (
              <>
                <div className="relative bg-black max-h-[65vh] flex items-center justify-center">
                  <img
                    src={previewState.item.imageUrl}
                    alt={previewState.item.title}
                    className="max-h-[65vh] w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewState(null)}
                    className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-700">
                    {getGalleryCategoryLabel(previewState.item.category)} • {previewState.item.date}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{previewState.item.title}</h4>
                  <p className="text-xs text-slate-600">{previewState.item.caption}</p>
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const photos = previewState.album.photos;
                  const currentPhoto = photos[previewState.photoIndex];
                  const activeUrl = currentPhoto?.imageUrl || previewState.album.coverImageUrl;
                  return (
                    <>
                      <div className="relative bg-black h-[55vh] flex items-center justify-center">
                        <img
                          src={activeUrl}
                          alt={currentPhoto?.title || previewState.album.title}
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewState(null)}
                          className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-full cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {photos.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewState({
                                  ...previewState,
                                  photoIndex:
                                    (previewState.photoIndex - 1 + photos.length) % photos.length,
                                })
                              }
                              className="absolute left-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewState({
                                  ...previewState,
                                  photoIndex: (previewState.photoIndex + 1) % photos.length,
                                })
                              }
                              className="absolute right-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-full cursor-pointer"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-emerald-700">
                            {previewState.album.title} ({previewState.photoIndex + 1}/{Math.max(1, photos.length)})
                          </span>
                          <span>{previewState.album.date}</span>
                        </div>
                        {currentPhoto?.caption && (
                          <p className="text-xs text-slate-600">{currentPhoto.caption}</p>
                        )}
                        {photos.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {photos.map((p, idx) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() =>
                                  setPreviewState({ ...previewState, photoIndex: idx })
                                }
                                className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                                  idx === previewState.photoIndex
                                    ? 'border-emerald-600'
                                    : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={p.imageUrl}
                                  alt={p.title || `Ảnh ${idx + 1}`}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
