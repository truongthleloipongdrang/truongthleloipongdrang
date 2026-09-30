import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  Upload,
  Search,
  Filter,
  FileText,
  FileCode,
  ShieldCheck,
  User,
  LogIn,
  CheckCircle2,
  Clock,
  Edit,
  X,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { DocumentItem, EditableCardPayload, MemberUser } from '../types';

interface DocumentsSectionProps {
  documents: DocumentItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  currentMember: MemberUser | null;
  onOpenMemberLogin: () => void;
  onUploadDocument: (newDoc: DocumentItem) => void;
  onIncrementDownload: (docId: string) => void;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  isAdmin,
  onEditCard,
  currentMember,
  onOpenMemberLogin,
  onUploadDocument,
  onIncrementDownload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCat, setUploadCat] = useState<'giao-an' | 'de-thi' | 'van-ban' | 'tap-huan' | 'stem' | 'hoc-sinh'>('giao-an');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('2.5 MB');
  const [uploadLink, setUploadLink] = useState('');

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'giao-an', label: 'Giáo Án GDPT 2018' },
    { id: 'de-thi', label: 'Đề Thi & Đáp Án' },
    { id: 'van-ban', label: 'Thông Tư & Văn Bản' },
    { id: 'tap-huan', label: 'Tài Liệu Tập Huấn' },
    { id: 'stem', label: 'Bài Giảng STEM' },
    { id: 'hoc-sinh', label: 'Tài Liệu Học Sinh' },
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchesQuery =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === 'all' || doc.category === selectedCat;
    return matchesQuery && matchesCat;
  });

  const handleDownloadClick = (doc: DocumentItem) => {
    if (!currentMember) {
      onOpenMemberLogin();
      return;
    }

    onIncrementDownload(doc.id);

    const hasExternalUrl =
      doc.downloadUrl &&
      doc.downloadUrl !== '#' &&
      (doc.downloadUrl.startsWith('http://') || doc.downloadUrl.startsWith('https://'));

    if (hasExternalUrl) {
      setDownloadSuccessToast(
        `Đang chuyển tiếp tới tài liệu: "${doc.title}"... Thành viên: ${currentMember.email}`
      );
      setTimeout(() => setDownloadSuccessToast(null), 4000);
      window.open(doc.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloadSuccessToast(
      `Đã bắt đầu tải về: "${doc.title}". Thành viên tải: ${currentMember.email}`
    );
    setTimeout(() => setDownloadSuccessToast(null), 4000);

    // Simulated file download fallback
    const dummyBlob = new Blob(
      [
        `Tài liệu: ${doc.title}\nTrường Tiểu Học Lê Lợi - Pơng Drang, Đắk Lắk\nĐược tải bởi: ${currentMember.email} (${currentMember.name})\nThời gian: ${new Date().toLocaleString('vi-VN')}\nLiên kết: ${doc.downloadUrl || 'Chưa cập nhật link ngoài'}`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(dummyBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/[^a-zA-Z0-9\-_]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) {
      onOpenMemberLogin();
      return;
    }

    const catLabels: Record<string, string> = {
      'giao-an': 'Giáo Án & Phân Phối',
      'de-thi': 'Đề Thi & Đáp Án',
      'van-ban': 'Thông Tư & Văn Bản',
      'tap-huan': 'Tài Liệu Tập Huấn',
      stem: 'Bài Giảng STEM',
      'hoc-sinh': 'Học Sinh Ôn Luyện',
    };

    const newDoc: DocumentItem = {
      id: 'doc-' + Date.now(),
      title: uploadTitle.trim(),
      category: uploadCat,
      categoryLabel: catLabels[uploadCat] || 'Tài Liệu Học Tập',
      fileSize: uploadFileSize,
      fileType: 'PDF / DOCX',
      uploadDate: new Date().toLocaleDateString('vi-VN'),
      uploaderName: currentMember.name || 'Thành viên',
      uploaderEmail: currentMember.email,
      downloadCount: 0,
      description: uploadDesc.trim() || 'Học liệu đóng góp bởi thành viên trường Tiểu học Lê Lợi.',
      downloadUrl: uploadLink.trim() || '#',
    };

    onUploadDocument(newDoc);
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadDesc('');
    setUploadLink('');
    setDownloadSuccessToast(
      `Đã đóng góp tài liệu thành công dưới tên: ${currentMember.email}!`
    );
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-200 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
            KHO HỌC LIỆU SỐ
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-emerald-700" />
            Kho Tài Liệu Dùng Chung - <span className="inline-block whitespace-nowrap">Tiểu Học Lê Lợi</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Dành cho Ban Giám hiệu, Thầy cô giáo, Quý phụ huynh và các em Học sinh.
          </p>
        </div>

        {/* Member Action / Status */}
        <div className="flex items-center space-x-3">
          {currentMember ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Đóng Góp Tài Liệu Mới</span>
            </button>
          ) : (
            <button
              onClick={onOpenMemberLogin}
              className="inline-flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Gmail Để Tải & Gửi</span>
            </button>
          )}
        </div>
      </div>

      {/* Member Session Banner Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>
            {currentMember ? (
              <>
                Đang đăng nhập với Gmail:{' '}
                <strong className="text-emerald-950">{currentMember.email}</strong>{' '}
                ({currentMember.role}) • Bạn có quyền tải về và đóng góp tài liệu.
              </>
            ) : (
              <>
                <strong>Quy định bảo mật:</strong> Quý vị vui lòng đăng nhập bằng địa chỉ Gmail để tải tài liệu về máy hoặc đóng góp học liệu lên kho.
              </>
            )}
          </span>
        </div>
        {!currentMember && (
          <button
            onClick={onOpenMemberLogin}
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0"
          >
            Đăng nhập ngay
          </button>
        )}
      </div>

      {/* Toast alert */}
      {downloadSuccessToast && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-700" />
            {downloadSuccessToast}
          </span>
          <button
            onClick={() => setDownloadSuccessToast(null)}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold w-full sm:w-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                selectedCat === c.id
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên tài liệu..."
            className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
        </div>
      </div>

      {/* 3. Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => {
          const isExternalUrl =
            doc.downloadUrl &&
            doc.downloadUrl !== '#' &&
            (doc.downloadUrl.startsWith('http://') || doc.downloadUrl.startsWith('https://'));

          return (
            <div
              key={doc.id}
              className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'documents',
                      itemId: doc.id,
                      title: doc.title,
                      subtitle: doc.categoryLabel,
                      content: doc.description,
                      extraField1Label: 'Đường link xem / tải tài liệu (Google Drive, PDF...)',
                      extraField1Value: doc.downloadUrl === '#' ? '' : doc.downloadUrl,
                      extraField2Label: 'Dung lượng file',
                      extraField2Value: doc.fileSize,
                      extraField3Label: 'Định dạng file',
                      extraField3Value: doc.fileType,
                      extraField4Label: 'Người đăng',
                      extraField4Value: `${doc.uploaderName} (${doc.uploaderEmail})`,
                    })
                  }
                  className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa thẻ này</span>
                </button>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {doc.categoryLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {doc.fileSize} • {doc.fileType}
                  </span>
                </div>

                {isExternalUrl && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full w-fit">
                    <LinkIcon className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>Có link xem trực tuyến (Drive/Cloud)</span>
                  </div>
                )}

                <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {doc.description}
                </p>

                <div className="pt-2 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>Ngày đăng: {doc.uploadDate}</span>
                    <span className="text-emerald-700 font-semibold">
                      {doc.downloadCount} lượt tải
                    </span>
                  </div>
                  <div className="truncate text-slate-500">
                    Đăng bởi: {doc.uploaderName} ({doc.uploaderEmail})
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDownloadClick(doc)}
                  className="w-full inline-flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  {isExternalUrl ? (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{currentMember ? 'Mở Xem & Tải Tài Liệu' : 'Đăng Nhập Để Mở Tài Liệu'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{currentMember ? 'Tải Tài Liệu Về Máy' : 'Đăng Nhập Để Tải Về'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Upload Modal for Member */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">Đóng Góp Tài Liệu Học Tập</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Tài khoản đóng góp: <strong>{currentMember?.email}</strong> (
                {currentMember?.name}). Thông tin tài liệu sẽ được lưu trữ minh bạch trong hệ thống nhà trường.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề tài liệu / Giáo án
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch bài dạy môn Toán lớp 2..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-lg p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Chuyên mục tài liệu
                </label>
                <select
                  value={uploadCat}
                  onChange={(e) => setUploadCat(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-lg p-2 text-sm text-slate-900 font-medium"
                >
                  <option value="giao-an">Giáo Án & Phân Phối</option>
                  <option value="de-thi">Đề Thi & Ma Trận</option>
                  <option value="van-ban">Thông Tư & Văn Bản</option>
                  <option value="tap-huan">Tài Liệu Tập Huấn</option>
                  <option value="stem">Bài Giảng STEM</option>
                  <option value="hoc-sinh">Tài Liệu Ôn Luyện Cho Học Sinh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Đường link xem / tải tài liệu (Google Drive, OneDrive, PDF...)
                </label>
                <input
                  type="url"
                  value={uploadLink}
                  onChange={(e) => setUploadLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... (hoặc link OneDrive, PDF)"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-lg p-2 text-xs font-mono text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * Dán đường link chia sẻ (nhớ bật quyền xem công khai) để người dùng có thể mở xem trực tiếp hoặc tải về.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả ngắn gọn về tài liệu
                </label>
                <textarea
                  rows={3}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Nội dung chính, mục tiêu bài học..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-lg p-2 text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-lg text-xs"
                >
                  Xác Nhận Tải Lên Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
