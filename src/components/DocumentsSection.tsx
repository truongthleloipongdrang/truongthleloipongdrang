import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Upload,
  Lock,
  Search,
  CheckCircle2,
  UserCheck,
  Calendar,
  FileType,
  X,
  ExternalLink,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentSubmission,
  EditableCardPayload,
  MemberUser,
} from '../types';
import {
  validateDocumentUrl,
  validateDocumentSubmissionInput,
  ALLOWED_DOCUMENT_FILE_TYPES,
} from '../urlValidation';
import {
  submitDocumentForReview,
  fetchMyDocumentSubmissions,
  isFirebaseSdkReady,
} from '../firebaseAuthStore';
import { isTrustedPreviewEnvironment } from '../authEnvironment';

interface DocumentsSectionProps {
  documents: DocumentItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  currentMember: MemberUser | null;
  onOpenMemberLogin: () => void;
  onIncrementDownload: (docId: string) => void;
  /** Giữ tương thích ngược với App.tsx cũ khi đồng bộ từng phần; tài liệu gửi lên luôn đi qua hàng đợi kiểm duyệt Firestore */
  onUploadDocument?: (doc: DocumentItem) => void;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  isAdmin,
  onEditCard,
  currentMember,
  onOpenMemberLogin,
  onIncrementDownload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [noticeToast, setNoticeToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Submission form state (chỉ gửi liên kết học liệu chờ duyệt — phù hợp Firebase Spark miễn phí)
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] =
    useState<DocumentItem['category']>('giao-an');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFileType, setUploadFileType] = useState<string>('PDF');
  const [uploadFileSize, setUploadFileSize] = useState('Liên kết trực tuyến');
  const [uploadUrl, setUploadUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Member's own pending/reviewed submissions
  const [mySubmissions, setMySubmissions] = useState<DocumentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNoticeToast({ type, text });
    setTimeout(() => {
      setNoticeToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadMySubmissions = useCallback(async () => {
    if (!currentMember?.uid || !isFirebaseSdkReady()) {
      setMySubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    try {
      const list = await fetchMyDocumentSubmissions(currentMember.uid);
      setMySubmissions(list);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [currentMember?.uid]);

  useEffect(() => {
    void loadMySubmissions();
  }, [loadMySubmissions]);

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

  const handleUnavailableClick = (reason?: string) => {
    showToast(
      'error',
      reason || 'Tài liệu chưa có tệp đính kèm. Vui lòng quay lại sau khi nhà trường cập nhật đường dẫn.'
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
    // Sử dụng thẻ <a> đã có href hợp lệ khi bấm nút mở trực tiếp (hoặc tạo thẻ <a> tạm an toàn)
    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!currentMember) {
      onOpenMemberLogin();
      return;
    }

    const validation = validateDocumentSubmissionInput({
      title: uploadTitle,
      category: uploadCategory,
      description: uploadDesc,
      fileType: uploadFileType,
      fileSize: uploadFileSize,
      downloadUrl: uploadUrl,
    });

    if (!validation.valid) {
      setSubmitError(validation.error);
      return;
    }

    if (isTrustedPreviewEnvironment()) {
      setSubmitError(
        'Môi trường xem trước AI Studio được cách ly khỏi Firebase Production. Chức năng gửi học liệu chờ duyệt hoạt động trên website chính thức.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitDocumentForReview({
        title: uploadTitle,
        category: uploadCategory,
        description: uploadDesc,
        fileType: uploadFileType,
        fileSize: uploadFileSize,
        downloadUrl: uploadUrl,
      });

      setMySubmissions((prev) => [created, ...prev]);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDesc('');
      setUploadUrl('');
      setUploadFileType('PDF');
      setUploadFileSize('Liên kết trực tuyến');
      showToast(
        'success',
        `Đã gửi học liệu "${created.title}" lên hệ thống! Học liệu đang ở trạng thái "Chờ quản trị viên duyệt" trước khi hiển thị công khai.`
      );
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Không thể gửi đóng góp học liệu lên Firebase. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
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
          Ngân hàng giáo án GDPT 2018, đề kiểm tra định kỳ, tài liệu ôn luyện tiểu học và công văn giáo dục được nhà trường kiểm duyệt.
        </p>
      </div>

      {/* Member Status & Contribution Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            {currentMember ? (
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
                  <strong>{currentMember.email}</strong>. Bạn có thể mở/tải các tài liệu có đường dẫn thật và gửi đóng góp học liệu chờ duyệt.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-white">
                  Đăng nhập thành viên bằng Google để tải &amp; đóng góp tài liệu
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Khách vãng lai vẫn xem được danh mục và mô tả tài liệu. Vui lòng đăng nhập bằng tài khoản Google để mở đường dẫn tải về hoặc gửi đề xuất học liệu.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {currentMember ? (
            <button
              type="button"
              onClick={() => {
                setSubmitError('');
                setShowUploadModal(true);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Đóng Góp Học Liệu</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMemberLogin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Đăng Nhập Bằng Google</span>
            </button>
          )}
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

      {/* Member's Own Submissions Status Box */}
      {currentMember && (loadingSubmissions || mySubmissions.length > 0) && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Học Liệu Bạn Đã Gửi Chờ Kiểm Duyệt ({mySubmissions.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Chỉ hiển thị công khai sau khi Quản trị viên nhà trường phê duyệt
            </span>
          </div>

          {loadingSubmissions ? (
            <div className="py-3 text-xs text-slate-500 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Đang tải danh sách học liệu bạn đã gửi...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mySubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 line-clamp-1">
                      {sub.title}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sub.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {sub.status === 'approved'
                        ? 'Đã duyệt xuất bản'
                        : sub.status === 'rejected'
                        ? 'Chưa được duyệt'
                        : 'Chờ duyệt'}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">{sub.description}</p>
                  {sub.reviewNote && (
                    <p className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1">
                      <strong>Phản hồi nhà trường:</strong> {sub.reviewNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {/* Contribution Modal (Link-only moderated submission for Firebase Spark Free Tier) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-emerald-800 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Đóng Góp Học Liệu (Gửi Chờ Duyệt)
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Chia sẻ đường dẫn học liệu hợp lệ để nhà trường kiểm duyệt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmissionSubmit}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {/* Honest Firebase Spark Free Tier explanation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Để tối ưu vận hành miễn phí và bảo mật an toàn trên nền tảng trường học, chức năng này tiếp nhận <strong>đường dẫn chia sẻ tài liệu</strong> (Google Drive, OneDrive, PDF trực tuyến...) có tiền tố <code className="bg-white px-1 rounded font-mono">https://</code>. Đề xuất của bạn sẽ được lưu ở trạng thái <strong>Chờ quản trị viên duyệt</strong> trước khi xuất bản.
                </p>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên tài liệu / Học liệu *
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={200}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ví dụ: Bộ đề ôn tập Toán lớp 4 học kỳ II..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Đường dẫn chia sẻ tài liệu (https://...) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-sm font-mono focus:outline-emerald-600"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Lưu ý: Với Google Drive, vui lòng bật quyền <em>&quot;Bất kỳ ai có đường liên kết đều có thể xem&quot;</em>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chuyên mục
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(e.target.value as DocumentItem['category'])
                    }
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white"
                  >
                    <option value="giao-an">Giáo Án &amp; Phân Phối</option>
                    <option value="de-thi">Đề Thi &amp; Đáp Án</option>
                    <option value="van-ban">Thông Tư &amp; Văn Bản</option>
                    <option value="tap-huan">Tài Liệu Tập Huấn</option>
                    <option value="stem">Bài Giảng STEM</option>
                    <option value="hoc-sinh">Học Sinh Ôn Luyện</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Định dạng
                  </label>
                  <select
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white"
                  >
                    {ALLOWED_DOCUMENT_FILE_TYPES.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dung lượng (ước tính)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={uploadFileSize}
                    onChange={(e) => setUploadFileSize(e.target.value)}
                    placeholder="Ví dụ: 2.5 MB"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả ngắn gọn nội dung *
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Nêu rõ khối lớp, môn học và nội dung chính của tài liệu..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-emerald-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi lên Firebase...</span>
                    </>
                  ) : (
                    <span>Gửi Quản Trị Viên Duyệt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
