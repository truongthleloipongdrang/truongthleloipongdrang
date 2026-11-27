import React, { useState } from 'react';
import {
  FileText,
  Download,
  Lock,
  Search,
  CheckCircle2,
  UserCheck,
  Calendar,
  FileType,
  ExternalLink,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  DocumentItem,
  EditableCardPayload,
  MemberUser,
} from '../types';
import { validateDocumentUrl } from '../urlValidation';

interface DocumentsSectionProps {
  documents: DocumentItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  currentMember: MemberUser | null;
  onOpenMemberLogin: () => void;
  onIncrementDownload: (docId: string) => void;
  canPublishDocuments?: boolean;
  onOpenDocumentPublisher?: () => void;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  isAdmin,
  onEditCard,
  currentMember,
  onOpenMemberLogin,
  onIncrementDownload,
  canPublishDocuments = false,
  onOpenDocumentPublisher,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeToast, setNoticeToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNoticeToast({ type, text });
    setTimeout(() => {
      setNoticeToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'giao-an', label: 'Giáo Án & Phân Phối' },
    { id: 'de-thi', label: 'Đề Thi & Đáp Án' },
    { id: 'van-ban', label: 'Thông Tư & Văn Bản' },
    { id: 'tap-huan', label: 'Tập Huấn GDPT 2018' },
    { id: 'stem', label: 'Bài Giảng STEM' },
    { id: 'hoc-sinh', label: 'Học Sinh Ôn Luyện' },
  ];

  const filteredDocs = documents.filter((d) => {
    const matchesCat =
      selectedCategory === 'all' || d.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.uploaderName.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const canAccessDownloads = Boolean(currentMember || isAdmin);
  const showDirectPublishButton = Boolean(
    (canPublishDocuments || isAdmin) && onOpenDocumentPublisher
  );

  const handleUnavailableClick = (reason?: string) => {
    showToast(
      'error',
      reason ||
        'Tài liệu chưa có tệp đính kèm. Vui lòng quay lại sau khi nhà trường cập nhật đường dẫn.'
    );
  };

  const handleOpenValidDocument = (docItem: DocumentItem, normalizedUrl: string) => {
    if (!canAccessDownloads) {
      onOpenMemberLogin();
      return;
    }
    onIncrementDownload(docItem.id);
    showToast(
      'success',
      `Đang mở tài liệu "${docItem.title}" từ liên kết chính thức.`
    );
    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          KHO HỌC LIỆU SỐ MỞ
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          Tài Liệu Dạy Học, Giáo Án &amp; Văn Bản
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Ngân hàng giáo án GDPT 2018, đề kiểm tra định kỳ, tài liệu ôn luyện tiểu học và công văn giáo dục được đội ngũ giáo viên &amp; nhà trường biên soạn, xuất bản trực tiếp.
        </p>
      </div>

      {/* Member Status & Direct Publishing Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            {currentMember || isAdmin ? (
              <UserCheck className="w-6 h-6 text-amber-300" />
            ) : (
              <Lock className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <div>
            {currentMember ? (
              <>
                <h3 className="font-bold text-base text-white">
                  Xin chào {currentMember.name}!
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Tài khoản Google đã xác thực:{' '}
                  <strong>{currentMember.email}</strong>.{' '}
                  {canPublishDocuments
                    ? 'Tài khoản của thầy/cô đã được phân quyền đăng và quản lý tài liệu trực tiếp vào Kho Học Liệu.'
                    : 'Bạn có thể mở và tải các tài liệu công khai có đường dẫn thật trong Kho Tài Liệu.'}
                </p>
              </>
            ) : isAdmin ? (
              <>
                <h3 className="font-bold text-base text-white">
                  Chế độ Quản trị Kho Tài Liệu đang bật
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Quản trị viên có thể thêm, sửa, xóa và xuất bản tài liệu trực tiếp cho giáo viên, phụ huynh và học sinh tải về.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-white">
                  Đăng nhập thành viên bằng Google để mở &amp; tải tài liệu
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Khách vãng lai vẫn xem được danh mục và mô tả tài liệu. Vui lòng đăng nhập bằng tài khoản Google để mở đường dẫn tải về.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {showDirectPublishButton ? (
            <button
              type="button"
              onClick={onOpenDocumentPublisher}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Tài Liệu Trực Tiếp</span>
            </button>
          ) : !currentMember && !isAdmin ? (
            <button
              type="button"
              onClick={onOpenMemberLogin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Đăng Nhập Bằng Google</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Toast Notification */}
      {noticeToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-bottom duration-300 border max-w-md ${
            noticeToast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-500'
              : 'bg-red-900 text-white border-red-500'
          }`}
        >
          {noticeToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
          )}
          <span className="leading-snug">{noticeToast.text}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm giáo án, đề thi, tài liệu..."
            className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
        </div>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((docItem) => {
          const urlCheck = validateDocumentUrl(docItem.downloadUrl);
          const hasValidRealUrl = Boolean(urlCheck.valid && urlCheck.normalizedUrl);

          return (
            <div
              key={docItem.id}
              className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'documents',
                      itemId: docItem.id,
                      title: docItem.title,
                      subtitle: docItem.categoryLabel,
                      content: docItem.description,
                      extraField1Label: 'Đường dẫn link tài liệu (https://...)',
                      extraField1Value:
                        docItem.downloadUrl === '#' ? '' : docItem.downloadUrl,
                      extraField2Label: 'Dung lượng',
                      extraField2Value: docItem.fileSize,
                      extraField3Label: 'Định dạng file (PDF, DOCX...)',
                      extraField3Value: docItem.fileType,
                    })
                  }
                  className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow cursor-pointer"
                >
                  Sửa thẻ này
                </button>
              )}

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {docItem.categoryLabel}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-emerald-800 transition-colors">
                      {docItem.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {docItem.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <span className="inline-flex items-center bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                    <FileType className="w-3 h-3 mr-1 text-emerald-600" />
                    {docItem.fileType}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                    {docItem.fileSize}
                  </span>
                  {hasValidRealUrl ? (
                    <span className="inline-flex items-center bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-semibold">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      {urlCheck.host}
                    </span>
                  ) : (
                    <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                      Chưa có tệp đính kèm
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[140px]">
                    Đăng: <strong>{docItem.uploaderName}</strong>
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {docItem.uploadDate}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {docItem.downloadCount} lượt mở
                  </span>

                  {!hasValidRealUrl ? (
                    <button
                      type="button"
                      onClick={() => handleUnavailableClick(urlCheck.error)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-not-allowed"
                      title="Tài liệu chưa có đường dẫn tệp đính kèm hợp lệ"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tài liệu chưa có tệp đính kèm</span>
                    </button>
                  ) : canAccessDownloads ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenValidDocument(docItem, urlCheck.normalizedUrl!)
                      }
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Mở / Tải Tài Liệu</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenMemberLogin}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Đăng nhập Google để tải</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
