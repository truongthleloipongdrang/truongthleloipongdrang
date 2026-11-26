import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Save,
  Download,
  Sparkles,
  Calendar,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  CheckCircle2,
  Video,
  Images,
  Search,
  Star,
} from 'lucide-react';
import type { ActivityItem } from '../types';
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryLabel,
  moveArrayItem,
  parseMultipleImageUrls,
  parseYouTubeUrl,
  validateHttpsImageUrl,
} from '../mediaHelpers';
import { ImageUrlPreview } from './ImageUrlPreview';

interface AdminActivitiesManagerProps {
  isAdmin: boolean;
  activities: ActivityItem[];
  savingOnline: boolean;
  isFirebaseOnline: boolean;
  hasUnsavedChanges?: boolean;
  onChangeActivities: (nextActivities: ActivityItem[]) => void;
  onSaveToFirebase: () => void;
  onBackupCurrentContent: () => void;
}

const todayLabel = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const AdminActivitiesManager: React.FC<AdminActivitiesManagerProps> = ({
  isAdmin,
  activities,
  savingOnline,
  isFirebaseOnline,
  hasUnsavedChanges = false,
  onChangeActivities,
  onSaveToFirebase,
  onBackupCurrentContent,
}) => {
  if (!isAdmin) return null;

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [localMsg, setLocalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add/Edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayLabel());
  const [category, setCategory] = useState<string>('van-nghe');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [coverLoadStatus, setCoverLoadStatus] = useState<string>('empty');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [bulkExtraUrls, setBulkExtraUrls] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [highlight, setHighlight] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm delete & preview states
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ActivityItem | null>(null);
  const [previewItem, setPreviewItem] = useState<ActivityItem | null>(null);
  const [previewActiveImg, setPreviewActiveImg] = useState<string>('');

  const showNotice = (type: 'success' | 'error', text: string) => {
    setLocalMsg({ type, text });
    window.setTimeout(() => {
      setLocalMsg((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  const openAddForm = () => {
    setEditingId(null);
    setTitle('');
    setDate(todayLabel());
    setCategory(filterCategory !== 'all' ? filterCategory : 'day-hoc');
    setDescription('');
    setContent('');
    setImageUrl('');
    setCoverLoadStatus('empty');
    setExtraImages([]);
    setBulkExtraUrls('');
    setVideoUrl('');
    setHighlight(false);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (act: ActivityItem) => {
    setEditingId(act.id);
    setTitle(act.title);
    setDate(act.date || todayLabel());
    setCategory(act.category || 'day-hoc');
    setDescription(act.description || '');
    setContent(act.content || '');
    setImageUrl(act.imageUrl || '');
    setExtraImages(Array.isArray(act.images) ? [...act.images] : []);
    setBulkExtraUrls('');
    setVideoUrl(act.videoUrl || '');
    setHighlight(Boolean(act.highlight));
    setFormError('');
    setFormOpen(true);
  };

  const handleAddExtraImages = () => {
    setFormError('');
    if (!bulkExtraUrls.trim()) return;
    const parsed = parseMultipleImageUrls(bulkExtraUrls);
    if (parsed.invalidLines.length > 0) {
      setFormError(
        `URL ảnh bổ sung không hợp lệ (chỉ chấp nhận HTTPS): "${parsed.invalidLines[0].line}"`
      );
      return;
    }
    const merged = Array.from(new Set([...extraImages, ...parsed.validUrls]));
    setExtraImages(merged);
    if (!imageUrl.trim() && parsed.validUrls[0]) {
      setImageUrl(parsed.validUrls[0]);
    }
    setBulkExtraUrls('');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanTitle = title.trim();
    const cleanDate = date.trim() || todayLabel();
    const cleanDesc = description.trim();
    const cleanContent = content.trim();

    if (cleanTitle.length < 3) {
      setFormError('Vui lòng nhập tiêu đề hoạt động (ít nhất 3 ký tự).');
      return;
    }

    if (cleanDesc.length < 5) {
      setFormError('Vui lòng nhập mô tả ngắn cho hoạt động (ít nhất 5 ký tự).');
      return;
    }

    const coverCheck = validateHttpsImageUrl(imageUrl);
    if (!coverCheck.valid || !coverCheck.normalizedUrl) {
      setFormError(coverCheck.error || 'URL ảnh đại diện HTTPS không hợp lệ.');
      return;
    }

    if (coverLoadStatus === 'error') {
      setFormError(
        'Ảnh đại diện không tải được từ URL này. Vui lòng kiểm tra lại liên kết ImageKit.io.'
      );
      return;
    }

    // Kiểm tra thêm nếu người dùng dán ảnh vào ô danh sách ảnh mà chưa bấm nút Thêm
    let finalExtraImages = [...extraImages];
    if (bulkExtraUrls.trim()) {
      const parsed = parseMultipleImageUrls(bulkExtraUrls);
      if (parsed.invalidLines.length > 0) {
        setFormError(
          `Danh sách ảnh bổ sung có URL không hợp lệ: "${parsed.invalidLines[0].line}"`
        );
        return;
      }
      finalExtraImages = Array.from(new Set([...finalExtraImages, ...parsed.validUrls]));
    }

    const ytCheck = parseYouTubeUrl(videoUrl);
    if (!ytCheck.valid) {
      setFormError(ytCheck.error || 'Link video YouTube không hợp lệ.');
      return;
    }

    const categoryLabel = getActivityCategoryLabel(category);

    const payload: ActivityItem = {
      id: editingId || `act-${Date.now()}`,
      title: cleanTitle,
      category,
      categoryLabel,
      date: cleanDate,
      description: cleanDesc,
      content: cleanContent || undefined,
      imageUrl: coverCheck.normalizedUrl,
      images: finalExtraImages.length > 0 ? finalExtraImages : undefined,
      videoUrl: !ytCheck.isEmpty && ytCheck.watchUrl ? ytCheck.watchUrl : undefined,
      highlight,
    };

    if (editingId) {
      onChangeActivities(activities.map((a) => (a.id === editingId ? payload : a)));
      showNotice(
        'success',
        `Đã cập nhật hoạt động "${cleanTitle}" (${categoryLabel}). Bấm "Lưu lên Firebase" để xuất bản.`
      );
    } else {
      onChangeActivities([payload, ...activities]);
      showNotice(
        'success',
        `Đã thêm hoạt động "${cleanTitle}" vào danh mục ${categoryLabel}. Bấm "Lưu lên Firebase" để xuất bản.`
      );
    }

    setFormOpen(false);
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    const idx = activities.findIndex((a) => a.id === id);
    if (idx === -1) return;
    onChangeActivities(moveArrayItem(activities, idx, direction));
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteItem) return;
    onChangeActivities(activities.filter((a) => a.id !== confirmDeleteItem.id));
    showNotice(
      'success',
      `Đã xóa hoạt động "${confirmDeleteItem.title}". Bấm "Lưu lên Firebase" để cập nhật website.`
    );
    setConfirmDeleteItem(null);
  };

  const filteredActivities = activities.filter((act) => {
    const matchCat = filterCategory === 'all' || act.category === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchQ =
      !q ||
      act.title.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q) ||
      act.categoryLabel.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const liveVideoValidation = videoUrl.trim() ? parseYouTubeUrl(videoUrl) : null;

  return (
    <div className="space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            <span>Quản Lý Hoạt Động Giáo Dục & Trải Nghiệm</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Thêm hoạt động theo 7 danh mục chuẩn, dán nhiều ảnh từ ImageKit.io và đính kèm video YouTube.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mới</span>
          </button>

          <button
            type="button"
            onClick={onBackupCurrentContent}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
            title="Sao lưu nội dung công khai hiện tại thành file JSON trước khi chỉnh sửa"
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

      {/* Inline notification */}
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

      {/* Search & Category Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm hoạt động theo tiêu đề, mô tả hoặc danh mục..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg border cursor-pointer whitespace-nowrap ${
              filterCategory === 'all'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả ({activities.length})
          </button>
          {ACTIVITY_CATEGORIES.map((cat) => {
            const count = activities.filter((a) => a.category === cat.id).length;
            return (
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
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            Chưa có hoạt động nào phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm hoạt động mới
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const realIdx = activities.findIndex((a) => a.id === act.id);
            const extraCount = act.images?.length || 0;
            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-emerald-300 transition-colors"
              >
                <div
                  onClick={() => {
                    setPreviewItem(act);
                    setPreviewActiveImg(act.imageUrl);
                  }}
                  className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group"
                >
                  <img
                    src={act.imageUrl}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {act.highlight && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      TIÊU ĐIỂM
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                      {getActivityCategoryLabel(act.category)}
                    </span>
                    <span className="text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {act.date}
                    </span>
                    {extraCount > 0 && (
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Images className="w-3 h-3 text-emerald-700" />+{extraCount} ảnh
                      </span>
                    )}
                    {act.videoUrl && (
                      <span className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        YouTube
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{act.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{act.description}</p>
                </div>

                <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleReorder(act.id, 'up')}
                      disabled={realIdx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                      title="Chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(act.id, 'down')}
                      disabled={realIdx === activities.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 disabled:opacity-35 text-slate-700 cursor-pointer"
                      title="Chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewItem(act);
                        setPreviewActiveImg(act.imageUrl);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(act)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteItem(act)}
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

      {/* ================= ADD / EDIT ACTIVITY MODAL ================= */}
      {formOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between sticky top-0 z-10">
              <h4 className="font-bold text-sm">
                {editingId ? 'Chỉnh Sửa Hoạt Động' : 'Thêm Hoạt Động Mới'}
              </h4>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề hoạt động *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hội diễn Văn nghệ chào mừng ngày Nhà giáo Việt Nam 20/11"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Danh mục hoạt động *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-semibold"
                  >
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày tổ chức *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 20/11/2026"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả ngắn *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tóm tắt ngắn gọn hiển thị ngoài thẻ hoạt động..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung chi tiết
                </label>
                <textarea
                  rows={4}
                  placeholder="Bài viết chi tiết về chương trình, thành phần tham dự, kết quả đạt được..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Ảnh đại diện (URL ImageKit.io HTTPS) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://ik.imagekit.io/..."
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setFormError('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
                <ImageUrlPreview
                  url={imageUrl}
                  alt={title || 'Ảnh đại diện hoạt động'}
                  aspectClass="h-44"
                  onStatusChange={setCoverLoadStatus}
                />
              </div>

              {/* Additional Images Gallery */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Danh sách ảnh bổ sung ({extraImages.length} ảnh)
                  </label>
                  <span className="text-[11px] text-slate-500">Mỗi dòng 1 URL ImageKit HTTPS</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    rows={2}
                    placeholder={'https://ik.imagekit.io/your_id/hinh-1.jpg\nhttps://ik.imagekit.io/your_id/hinh-2.jpg'}
                    value={bulkExtraUrls}
                    onChange={(e) => setBulkExtraUrls(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddExtraImages}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer self-start"
                  >
                    + Thêm ảnh
                  </button>
                </div>

                {extraImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {extraImages.map((img, idx) => (
                      <div
                        key={`${img}-${idx}`}
                        className="bg-white border border-slate-200 rounded-xl p-1.5 space-y-1"
                      >
                        <img
                          src={img}
                          alt={`Ảnh bổ sung ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg bg-slate-100"
                        />
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setImageUrl(img)}
                            className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded cursor-pointer inline-flex items-center gap-0.5"
                            title="Dùng làm ảnh đại diện"
                          >
                            <Star className="w-2.5 h-2.5" /> Đại diện
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraImages(extraImages.filter((_, i) => i !== idx))
                            }
                            className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* YouTube Video Link */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Link video YouTube (tùy chọn)
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setFormError('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
                {liveVideoValidation && !liveVideoValidation.valid && (
                  <p className="text-xs text-red-600 font-semibold">{liveVideoValidation.error}</p>
                )}
                {liveVideoValidation?.valid && liveVideoValidation.embedUrl && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
                    <iframe
                      src={liveVideoValidation.embedUrl}
                      title="Xem trước video YouTube"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highlight}
                  onChange={(e) => setHighlight(e.target.checked)}
                  className="w-4 h-4 accent-emerald-700"
                />
                <span>Đưa lên mục Tiêu Điểm Hoạt Động ngoài Trang Chủ</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  {editingId ? 'Cập nhật hoạt động' : 'Thêm hoạt động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE DIALOG ================= */}
      {confirmDeleteItem && (
        <div
          className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteItem(null)}
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
                <h4 className="font-bold text-slate-900 text-sm">Xác nhận xóa hoạt động</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn có chắc chắn muốn xóa hoạt động{' '}
                  <strong>"{confirmDeleteItem.title}"</strong> ({getActivityCategoryLabel(confirmDeleteItem.category)}) không?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PREVIEW ACTIVITY MODAL ================= */}
      {previewItem && (
        <div
          className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 bg-slate-900 shrink-0">
              <img
                src={previewActiveImg || previewItem.imageUrl}
                alt={previewItem.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="absolute top-3 right-3 bg-slate-900/75 text-white p-2 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-3 left-3 bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-xl">
                {getActivityCategoryLabel(previewItem.category)}
              </span>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Ngày tổ chức: {previewItem.date}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{previewItem.title}</h3>
              <p className="text-sm font-semibold text-slate-700 bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl">
                {previewItem.description}
              </p>
              {previewItem.content && (
                <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {previewItem.content}
                </div>
              )}

              {previewItem.images && previewItem.images.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase">
                    Hình ảnh hoạt động ({previewItem.images.length + 1})
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[previewItem.imageUrl, ...previewItem.images].map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setPreviewActiveImg(url)}
                        className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                          (previewActiveImg || previewItem.imageUrl) === url
                            ? 'border-emerald-600'
                            : 'border-slate-200 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const yt = parseYouTubeUrl(previewItem.videoUrl);
                if (!yt.valid || !yt.embedUrl) return null;
                return (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700 uppercase">Video hoạt động</div>
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200">
                      <iframe
                        src={yt.embedUrl}
                        title={previewItem.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
