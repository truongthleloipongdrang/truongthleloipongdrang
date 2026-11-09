import React, { useState } from 'react';
import {
  Newspaper,
  Search,
  Calendar,
  User,
  ChevronRight,
  Filter,
  Edit,
  X,
  Share2,
  Clock,
  Star,
  PlusCircle,
  ExternalLink,
  Globe,
  Link2,
  Sparkles,
  CheckCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { NewsItem, EditableCardPayload } from '../types';

interface NewsSectionProps {
  newsList: NewsItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  selectedNews: NewsItem | null;
  onSelectNews: (news: NewsItem | null) => void;
  onToggleFeatureNews?: (newsId: string) => void;
  onAddNews?: (news: Omit<NewsItem, 'id'>) => Promise<boolean | void> | void;
  onDeleteNews?: (newsId: string) => void;
}

const PRESET_NEWS_IMAGES = [
  {
    name: 'Học sinh & Lớp học vùng cao',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Khuôn viên trường khang trang',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Công nghệ & Chuyển đổi số',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Đọc sách & Văn hóa truyền thống',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
  },
];

const SOURCE_PRESETS = [
  'Báo Đắk Lắk',
  'Báo Giáo Dục & Thời Đại',
  'Cổng TTĐT Bộ GD&ĐT',
  'Báo Dân Trí',
  'VnExpress',
  'Báo Tuổi Trẻ',
  'Trang TTĐT Xã Pơng Drang',
];

export const NewsSection: React.FC<NewsSectionProps> = ({
  newsList,
  isAdmin,
  onEditCard,
  selectedNews,
  onSelectNews,
  onToggleFeatureNews,
  onAddNews,
  onDeleteNews,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Form states for creating news
  const [postMode, setPostMode] = useState<'internal' | 'external'>('external');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'thong-bao' | 'tin-tuc' | 'hoat-dong'>('tin-tuc');
  const [externalUrl, setExternalUrl] = useState('');
  const [sourceName, setSourceName] = useState('Báo Đắk Lắk');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_NEWS_IMAGES[0].url);
  const [author, setAuthor] = useState('Ban Truyền Thông TH Lê Lợi');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'thong-bao', label: 'Thông Báo' },
    { id: 'tin-tuc', label: 'Tin Tức' },
    { id: 'hoat-dong', label: 'Sự Kiện' },
    { id: 'external', label: 'Tin Báo Chí & Liên Kết' },
  ];

  const filteredNews = newsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sourceName && item.sourceName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (selectedCategory === 'external') {
      return matchesSearch && Boolean(item.externalUrl || item.isExternalLink);
    }

    const matchesCategory =
      selectedCategory === 'all' ||
      item.category === selectedCategory ||
      (selectedCategory === 'tin-tuc' && item.category === 'chuyen-doi-so');
    return matchesSearch && matchesCategory;
  });

  const featured = newsList.find((n) => n.isFeatured) || newsList[0];

  // Khung tin nổi bật lớn chỉ hiển thị ở danh mục 'Tất Cả' và khi không có từ khóa tìm kiếm
  const isFeaturedBannerVisible = Boolean(featured && selectedCategory === 'all' && !searchTerm.trim());

  // Danh sách thẻ tin tức hiển thị ở lưới bên dưới:
  // Tự động loại trừ bài đang hiển thị trong khung nổi bật lớn phía trên để tránh bị lặp lại 2 lần
  const displayedNewsList = isFeaturedBannerVisible && featured
    ? filteredNews.filter((item) => item.id !== featured.id)
    : filteredNews;

  const handleResetForm = () => {
    setTitle('');
    setExternalUrl('');
    setSourceName('Báo Đắk Lắk');
    setSummary('');
    setContent('');
    setImageUrl(PRESET_NEWS_IMAGES[0].url);
    setIsFeatured(false);
    setSubmitError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSubmitError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    let cleanUrl = externalUrl.trim();
    if (postMode === 'external') {
      if (!cleanUrl) {
        setSubmitError('Vui lòng dán đường link (URL) bài báo hoặc bài viết cần chia sẻ.');
        return;
      }
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }
    }

    const categoryLabels: Record<string, string> = {
      'thong-bao': 'Thông Báo',
      'tin-tuc': postMode === 'external' ? 'Tin Báo Chí' : 'Tin Giáo Dục',
      'hoat-dong': 'Sự Kiện',
    };

    const finalSummary = summary.trim() || trimmedTitle;
    const finalContent = content.trim() || finalSummary;

    const newNewsItem: Omit<NewsItem, 'id'> = {
      title: trimmedTitle,
      category,
      categoryLabel:
        categoryLabels[category] || (postMode === 'external' ? 'Tin Báo Chí' : 'Tin Tức'),
      summary: finalSummary,
      content: finalContent,
      imageUrl: imageUrl.trim() || PRESET_NEWS_IMAGES[0].url,
      date: date.trim() || new Date().toLocaleDateString('vi-VN'),
      author:
        postMode === 'external'
          ? (sourceName.trim() ? `Nguồn: ${sourceName.trim()}` : author)
          : author,
      isFeatured,
      isExternalLink: postMode === 'external',
      externalUrl: postMode === 'external' ? cleanUrl : undefined,
      sourceName: postMode === 'external' ? (sourceName.trim() || 'Internet') : undefined,
    };

    setIsSubmitting(true);
    try {
      if (onAddNews) {
        await onAddNews(newNewsItem);
      }
      handleResetForm();
      setShowCreateModal(false);
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Có lỗi xảy ra khi lưu bài viết lên hệ thống. Vui lòng kiểm tra lại kết nối.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-200 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
            BẢN TIN GIÁO DỤC
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-emerald-700" />
            Tin Tức & Thông Báo <span className="inline-block whitespace-nowrap">Trường Lê Lợi</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                handleResetForm();
                setShowCreateModal(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-transform hover:scale-102 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-200" />
              <span>Đăng Tin / Chia Sẻ Link Báo</span>
            </button>
          )}

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tin tức, nguồn báo..."
              className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* 2. Categories Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Featured News Banner */}
      {isFeaturedBannerVisible && featured && (
        <div className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
          {isAdmin && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={() => onToggleFeatureNews?.(featured.id)}
                className={`font-black px-3 py-1 rounded-full text-[11px] shadow-md flex items-center space-x-1.5 transition-all ${
                  featured.isFeatured
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white/95 hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title={
                  featured.isFeatured
                    ? 'Bỏ ghim bài này khỏi Trang Chủ'
                    : 'Ghim bài này lên Trang Chủ'
                }
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    featured.isFeatured
                      ? 'fill-slate-950 text-slate-950'
                      : 'text-slate-400'
                  }`}
                />
                <span>
                  {featured.isFeatured
                    ? '★ Đang Ghim Trang Chủ'
                    : '☆ Ghim Trang Chủ'}
                </span>
              </button>

              <button
                onClick={() =>
                  onEditCard({
                    sectionKey: 'news',
                    itemId: featured.id,
                    title: featured.title,
                    subtitle: featured.categoryLabel,
                    content: featured.content,
                    imageUrl: featured.imageUrl,
                    category: featured.category,
                    isFeatured: featured.isFeatured,
                    isExternalLink: Boolean(featured.externalUrl),
                    externalUrl: featured.externalUrl,
                    sourceName: featured.sourceName,
                    extraField1Label: 'Ngày đăng',
                    extraField1Value: featured.date,
                    extraField2Label: 'Tác giả',
                    extraField2Value: featured.author,
                    extraField3Label: 'Link chia sẻ gốc (URL bài báo/internet)',
                    extraField3Value: featured.externalUrl || '',
                    extraField4Label: 'Tên nguồn (VD: Báo Đắk Lắk, GD&TĐ...)',
                    extraField4Value: featured.sourceName || '',
                  })
                }
                className="bg-slate-900 hover:bg-black text-white font-bold px-3 py-1 rounded-full text-[11px] shadow-md flex items-center space-x-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa tin nổi bật này</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 h-64 lg:h-96 overflow-hidden relative">
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              {featured.externalUrl && (
                <div className="absolute top-4 left-4 bg-sky-900/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow">
                  <Globe className="w-3.5 h-3.5 text-sky-300" />
                  <span>Tin từ {featured.sourceName || 'Internet'}</span>
                </div>
              )}
            </div>
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block">
                    ★ TIN NỔI BẬT NHẤT
                  </span>
                  {featured.sourceName && (
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" /> {featured.sourceName}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-slate-400 space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{featured.date}</span>
                  <span>•</span>
                  <span>{featured.author}</span>
                </div>
                <h3
                  onClick={() => onSelectNews(featured)}
                  className="text-xl sm:text-2xl font-black text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors leading-snug"
                >
                  {featured.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-4 leading-relaxed">
                  {featured.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onSelectNews(featured)}
                  className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <span>Xem Chi Tiết Bài Viết</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
                {featured.externalUrl && (
                  <a
                    href={featured.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold px-3.5 py-2 rounded-xl text-xs border border-sky-200 transition-colors shadow-xs"
                  >
                    <span>Mở bài gốc trên {featured.sourceName || 'trang báo'}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. News List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedNewsList.map((news) => (
          <div
            key={news.id}
            className={`relative group bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between ${
              news.isFeatured
                ? 'border-amber-400 ring-2 ring-amber-200/60'
                : 'border-slate-200 hover:border-emerald-400'
            }`}
          >
            {isAdmin && (
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                <button
                  onClick={() => onToggleFeatureNews?.(news.id)}
                  className={`font-black px-2.5 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1 transition-all ${
                    news.isFeatured
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-1 ring-amber-300'
                      : 'bg-white/95 hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={
                    news.isFeatured
                      ? 'Bỏ ghim khỏi Trang Chủ'
                      : 'Ghim nổi bật lên Trang Chủ'
                  }
                >
                  <Star
                    className={`w-3 h-3 ${
                      news.isFeatured
                        ? 'fill-slate-950 text-slate-950'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{news.isFeatured ? 'Đang ghim' : 'Ghim'}</span>
                </button>

                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'news',
                      itemId: news.id,
                      title: news.title,
                      subtitle: news.categoryLabel,
                      content: news.content,
                      imageUrl: news.imageUrl,
                      category: news.category,
                      isFeatured: news.isFeatured,
                      isExternalLink: Boolean(news.externalUrl),
                      externalUrl: news.externalUrl,
                      sourceName: news.sourceName,
                      extraField1Label: 'Ngày đăng',
                      extraField1Value: news.date,
                      extraField2Label: 'Tác giả',
                      extraField2Value: news.author,
                      extraField3Label: 'Link chia sẻ gốc (URL bài báo/internet)',
                      extraField3Value: news.externalUrl || '',
                      extraField4Label: 'Tên nguồn (VD: Báo Đắk Lắk, GD&TĐ...)',
                      extraField4Value: news.sourceName || '',
                    })
                  }
                  className="bg-slate-900 hover:bg-black text-white font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa</span>
                </button>
              </div>
            )}

            <div>
              <div className="h-44 overflow-hidden relative">
                <img
                  src={news.imageUrl}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {news.isFeatured && (
                  <span className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>GHIM TRANG CHỦ</span>
                  </span>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-emerald-900/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-xs">
                    {news.categoryLabel}
                  </span>
                  {news.sourceName && (
                    <span className="bg-sky-900/90 text-sky-200 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5 text-sky-300" />
                      {news.sourceName}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center text-[11px] text-slate-400 space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{news.date}</span>
                  <span>•</span>
                  <span className="line-clamp-1">{news.author}</span>
                </div>
                <h4
                  onClick={() => onSelectNews(news)}
                  className="font-bold text-base text-slate-900 line-clamp-2 hover:text-emerald-700 cursor-pointer transition-colors"
                >
                  {news.title}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {news.summary}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-1">
              <button
                onClick={() => onSelectNews(news)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center cursor-pointer"
              >
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {news.externalUrl && (
                <a
                  href={news.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors shadow-2xs"
                  title="Mở bài viết gốc trên trang báo"
                >
                  <span>Mở link gốc</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
          <p className="text-slate-500 text-sm">
            Không tìm thấy bản tin nào phù hợp với từ khóa "{searchTerm}".
          </p>
        </div>
      )}

      {/* 5. Reader Modal for Full Article View */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="relative h-64 sm:h-80 overflow-hidden shrink-0">
              <img
                src={selectedNews.imageUrl}
                alt={selectedNews.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onSelectNews(null)}
                className="absolute top-4 right-4 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-lg shadow">
                  {selectedNews.categoryLabel}
                </span>
                {selectedNews.sourceName && (
                  <span className="bg-sky-800 text-white text-xs font-bold px-3 py-1 rounded-lg shadow flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-sky-300" />
                    {selectedNews.sourceName}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
              <div className="flex items-center text-xs text-slate-500 space-x-3">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-emerald-600" />
                  {selectedNews.date}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <User className="w-4 h-4 mr-1 text-emerald-600" />
                  {selectedNews.author}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {selectedNews.title}
              </h2>

              {/* Callout box if this is an external article from internet/newspaper */}
              {selectedNews.externalUrl && (
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-col sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center space-x-2 text-sky-900 font-extrabold text-xs uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-sky-600" />
                        <span>Bài Viết Được Chia Sẻ Từ Internet</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Nguồn báo: <strong className="text-slate-800">{selectedNews.sourceName || 'Trang báo điện tử'}</strong>
                      </p>
                    </div>

                    <a
                      href={selectedNews.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-colors shadow-md shrink-0"
                    >
                      <span>Đọc bài gốc trên {selectedNews.sourceName || 'trang báo'}</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  </div>
                </div>
              )}

              <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-4 rounded-xl border-l-4 border-emerald-600 italic">
                {selectedNews.summary}
              </p>

              <div className="text-sm text-slate-800 leading-relaxed space-y-3 whitespace-pre-line pt-2">
                {selectedNews.content || selectedNews.summary}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Trường Tiểu Học Lê Lợi - Pơng Drang</span>
              <button
                onClick={() => onSelectNews(null)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Create News / Share External Link */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-base">Đăng Tin Bài / Chia Sẻ Link Báo</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-5">
              {submitError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start space-x-3 text-red-900 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-extrabold text-red-800">Không thể đăng bài viết</div>
                    <p className="leading-relaxed">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Hình thức đăng bài
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPostMode('external')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                      postMode === 'external'
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-sky-950">
                        Chia sẻ link Báo chí / Internet
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Dán URL bài báo (Báo Đắk Lắk, GD&TĐ...)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPostMode('internal')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                      postMode === 'internal'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-emerald-950">
                        Tự soạn bài viết nhà trường
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Soạn văn bản thông báo hoặc tin nội bộ
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* External Link Fields */}
              {postMode === 'external' && (
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-sky-950 uppercase tracking-wide mb-1">
                      Đường link chia sẻ (URL bài báo/internet) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      required={postMode === 'external'}
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://baodaklak.vn/giao-duc/..."
                      className="w-full bg-white border border-sky-300 focus:border-sky-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sky-950 uppercase tracking-wide mb-1">
                      Tên nguồn bài viết / Tòa soạn
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="VD: Báo Đắk Lắk, Báo Giáo Dục & Thời Đại..."
                      className="w-full bg-white border border-sky-300 focus:border-sky-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-2xs mb-2"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold mr-1">Gợi ý nhanh:</span>
                      {SOURCE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setSourceName(preset)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            sourceName === preset
                              ? 'bg-sky-600 text-white'
                              : 'bg-white border border-sky-200 text-sky-800 hover:bg-sky-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tin tức hoặc tiêu đề bài báo..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Chuyên mục
                  </label>
                  <select
                    disabled={isSubmitting}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900"
                  >
                    <option value="tin-tuc">Tin Tức / Tin Báo Chí</option>
                    <option value="thong-bao">Thông Báo</option>
                    <option value="hoat-dong">Sự Kiện</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Ngày đăng
                  </label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tóm tắt / Lời dẫn giới thiệu <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  disabled={isSubmitting}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Đoạn văn ngắn tóm tắt nội dung chính của bài viết..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 leading-relaxed"
                />
              </div>

              {/* Full Content (optional if external) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Nội dung chi tiết {postMode === 'external' ? '(Trích đoạn / Tùy chọn)' : '(Toàn văn)'}
                </label>
                <textarea
                  rows={4}
                  disabled={isSubmitting}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    postMode === 'external'
                      ? 'Dán một số đoạn trích quan trọng từ bài báo nếu muốn người đọc xem trước...'
                      : 'Nhập toàn bộ nội dung bài viết...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 leading-relaxed"
                />
              </div>

              {/* Image URL & Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Link ảnh minh họa
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 mb-2"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold">Ảnh mẫu:</span>
                  {PRESET_NEWS_IMAGES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setImageUrl(preset.url)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        imageUrl === preset.url
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pinned to Home option */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Ghim nổi bật bài này lên Trang Chủ</span>
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Bài viết sẽ xuất hiện ở vị trí tiêu điểm trên trang chủ website.
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={isSubmitting}
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowCreateModal(false);
                    setSubmitError('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Đang Lưu Lên Firebase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{postMode === 'external' ? 'Đăng Bài Chia Sẻ' : 'Đăng Bài Viết'}</span>
                    </>
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
