import React, { useState } from 'react';
import {
  X,
  Save,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  Eye,
  RefreshCw,
  Info,
} from 'lucide-react';
import { EditableCardPayload } from '../types';
import { generateTeacherBioWithAI } from '../geminiConfig';

interface EditCardModalProps {
  cardData: EditableCardPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: EditableCardPayload) => void;
}

const PRESET_SCHOOL_IMAGES = [
  {
    name: 'Khuôn viên trường & Cây xanh',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Lớp học & Học sinh thảo luận',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Thư viện trường học',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Sân trường rợp bóng cây Tây Nguyên',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Giờ học mỹ thuật & Sáng tạo',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Phòng máy tính & Chuyển đổi số',
    url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Thầy giáo phong thái sư phạm',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Cô giáo dịu dàng, ân cần',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  },
];

export const EditCardModal: React.FC<EditCardModalProps> = ({
  cardData,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !cardData) return null;

  const [form, setForm] = useState<EditableCardPayload>({ ...cardData });
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const handleAiBio = async () => {
    setIsGeneratingAi(true);
    setAiSuccessMessage('');
    try {
      const generated = await generateTeacherBioWithAI({
        name: form.title,
        role: form.subtitle || 'Cán bộ giáo viên',
        subjectOrGrade: form.extraField1Value || 'Tiểu học',
        campus: form.extraField2Value || 'Trường chính',
        qualification: 'Cử nhân Sư phạm',
      });
      setForm((prev) => ({ ...prev, content: generated }));
      setAiSuccessMessage('Đã tạo mô tả thành công bằng AI!');
    } catch {
      // handled inside helper
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const isTeacherOrPrincipal =
    cardData.sectionKey === 'principals' || cardData.sectionKey === 'teachers';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-amber-300">
              ✏️
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold">
                CHỈNH SỬA THẺ / MỤC: {cardData.sectionKey.toUpperCase()}
              </span>
              <h2 className="text-lg font-bold truncate max-w-md sm:max-w-xl text-white">
                {cardData.title || 'Nội dung thẻ'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Card Identifier Notice to eliminate confusion */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">
                Bạn đang chỉnh sửa đúng thẻ:{' '}
                <span className="text-emerald-700 font-bold">"{form.title}"</span>
              </p>
              <p className="text-emerald-700 mt-0.5">
                Các thay đổi dưới đây sẽ được áp dụng ngay lập tức vào thẻ này sau khi bấm Lưu.
              </p>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Tiêu đề chính / Họ tên
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition-colors"
            />
          </div>

          {/* Subtitle / Category Field */}
          {form.subtitle !== undefined && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Chức danh / Chuyên mục / Phụ đề
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800 transition-colors"
              />
            </div>
          )}

          {/* Extra Fields (e.g. Campus, Grade, Date, Stats) */}
          {(form.extraField1Label || form.extraField2Label) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.extraField1Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField1Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField1Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField1Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
              {form.extraField2Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField2Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField2Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField2Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          {(form.extraField3Label || form.extraField4Label) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.extraField3Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField3Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField3Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField3Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
              {form.extraField4Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField4Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField4Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField4Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          {(form.extraField5Label || form.extraField6Label) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.extraField5Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField5Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField5Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField5Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
              {form.extraField6Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    {form.extraField6Label}
                  </label>
                  <input
                    type="text"
                    value={form.extraField6Value || ''}
                    onChange={(e) =>
                      setForm({ ...form, extraField6Value: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          {/* Content / Bio Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Nội dung chi tiết / Mô tả
              </label>
              {isTeacherOrPrincipal && (
                <button
                  type="button"
                  onClick={handleAiBio}
                  disabled={isGeneratingAi}
                  className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 rounded-full transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {isGeneratingAi ? 'Đang tạo mô tả...' : '✨ AI viết mô tả'}
                </button>
              )}
            </div>
            {aiSuccessMessage && (
              <p className="text-xs text-emerald-600 flex items-center mb-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {aiSuccessMessage}
              </p>
            )}
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg p-3 text-sm text-slate-800 transition-colors"
              placeholder="Nhập nội dung hiển thị..."
            ></textarea>
          </div>

          {/* Image URL & Preset Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Hình ảnh đại diện / Minh họa (URL)
              </label>
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                {showPresets ? 'Đóng kho ảnh mẫu' : 'Chọn nhanh từ kho ảnh trường'}
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={form.imageUrl || ''}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://... (hoặc dán link ảnh tùy ý)"
                className="flex-1 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
              />
              {form.imageUrl && (
                <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.3';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Preset Images Gallery */}
            {showPresets && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-600 mb-2 font-medium">
                  Bấm vào ảnh để áp dụng ngay:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_SCHOOL_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, imageUrl: preset.url });
                        setShowPresets(false);
                      }}
                      className="group text-left border border-slate-200 hover:border-emerald-600 rounded-lg overflow-hidden bg-white transition-all hover:shadow-xs"
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-16 object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="block p-1 text-[10px] text-slate-700 truncate font-medium">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Caption if present in payload */}
            {form.imageCaption !== undefined && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Chú thích hình ảnh (Caption)
                </label>
                <input
                  type="text"
                  value={form.imageCaption || ''}
                  onChange={(e) =>
                    setForm({ ...form, imageCaption: e.target.value })
                  }
                  placeholder="Ví dụ: Trường chính rợp bóng cây xanh tại Thôn Ea Tút..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 flex items-center mb-2">
              <Eye className="w-3.5 h-3.5 mr-1" />
              Xem trước hiển thị của thẻ (Khớp 100% khi lưu)
            </span>
            <div className="bg-white rounded-lg p-3 border border-emerald-100 shadow-xs space-y-3">
              <div className="flex gap-3 items-start">
                {form.imageUrl && (
                  <div className="shrink-0 space-y-1">
                    <img
                      src={form.imageUrl}
                      alt={form.title}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-100 shadow-2xs"
                    />
                    {form.imageCaption && (
                      <p className="text-[9px] text-slate-500 max-w-[100px] truncate italic">
                        {form.imageCaption}
                      </p>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {form.subtitle && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                      {form.subtitle}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                    {form.title}
                  </h4>
                  {form.sectionKey === 'teachers' && (
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5 flex flex-wrap items-center gap-1">
                      {form.extraField1Value && <span>{form.extraField1Value}</span>}
                      {form.extraField2Value && (
                        <span className="text-emerald-700 font-semibold flex items-center">
                          • 📍 {form.extraField2Value}
                        </span>
                      )}
                    </div>
                  )}
                  {form.sectionKey !== 'admissionsEligibility' && form.sectionKey !== 'admissionsRequiredDocs' && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                      {form.content}
                    </p>
                  )}
                  {form.sectionKey === 'admissionsEligibility' && (
                    <ul className="text-xs text-slate-700 mt-2 space-y-1.5">
                      {form.content.split('\n').filter(Boolean).map((line, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="leading-snug">{line.replace(/^[✓•\-\*]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.sectionKey === 'admissionsRequiredDocs' && (
                    <ul className="text-xs text-slate-700 mt-2 space-y-1.5">
                      {form.content.split('\n').filter(Boolean).map((line, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{line.replace(/^(\d+[\.\)]|[•\-\*])\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Achievements badges preview for teachers */}
              {form.sectionKey === 'teachers' && form.extraField3Value && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {form.extraField3Value
                    .split(',')
                    .map(
                      (item, idx) =>
                        item.trim() && (
                          <span
                            key={idx}
                            className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded font-medium inline-flex items-center"
                          >
                            🎖️ {item.trim()}
                          </span>
                        )
                    )}
                </div>
              )}

              {/* Live preview for stats (e.g. 1998, 03, Mức Độ 1) */}
              {form.sectionKey !== 'teachers' &&
                form.sectionKey !== 'admissionsHomeTeaser' &&
                form.sectionKey !== 'documentsHomeTeaser' &&
                form.extraField1Value &&
                form.extraField3Value && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    <span className="block font-black text-sm text-emerald-800">
                      {form.extraField1Value}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {form.extraField2Value || form.extraField1Label}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    <span className="block font-black text-sm text-emerald-800">
                      {form.extraField3Value}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {form.extraField4Value || form.extraField3Label}
                    </span>
                  </div>
                  {form.extraField5Value && (
                    <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                      <span className="block font-black text-sm text-amber-700">
                        {form.extraField5Value}
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">
                        {form.extraField6Value || form.extraField5Label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Admissions Teaser live preview banner */}
              {form.sectionKey === 'admissionsHomeTeaser' && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    🎯 Chỉ tiêu: {form.extraField2Value || '150'} học sinh | Niên khóa: {form.extraField1Value || '2026 - 2027'}
                  </span>
                  {form.extraField3Value && (
                    <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded">
                      Nút: {form.extraField3Value}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Thay Đổi Thẻ Này</span>
          </button>
        </div>
      </div>
    </div>
  );
};
