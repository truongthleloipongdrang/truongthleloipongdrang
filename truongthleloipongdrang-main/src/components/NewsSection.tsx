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
} from 'lucide-react';
import { NewsItem, EditableCardPayload } from '../types';

interface NewsSectionProps {
  newsList: NewsItem[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  selectedNews: NewsItem | null;
  onSelectNews: (news: NewsItem | null) => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({
  newsList,
  isAdmin,
  onEditCard,
  selectedNews,
  onSelectNews,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'thong-bao', label: 'Thông Báo' },
    { id: 'tin-tuc', label: 'Tin Tức' },
    { id: 'hoat-dong', label: 'Hoạt Động' },
    { id: 'chuyen-doi-so', label: 'Chuyển Đổi Số' },
  ];

  const filteredNews = newsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featured = newsList.find((n) => n.isFeatured) || newsList[0];

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

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tin tức, thông báo..."
            className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* 2. Categories Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
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
      {featured && selectedCategory === 'all' && !searchTerm && (
        <div className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
          {isAdmin && (
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
                  extraField1Label: 'Ngày đăng',
                  extraField1Value: featured.date,
                  extraField2Label: 'Tác giả',
                  extraField2Value: featured.author,
                })
              }
              className="absolute top-4 right-4 z-20 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow"
            >
              Sửa tin nổi bật này
            </button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 h-64 lg:h-96 overflow-hidden">
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
            </div>
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block">
                  ★ TIN NỔI BẬT NHẤT
                </span>
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

              <div>
                <button
                  onClick={() => onSelectNews(featured)}
                  className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                >
                  <span>Đọc Toàn Văn Bài Viết</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. News List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.map((news) => (
          <div
            key={news.id}
            className="relative group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
          >
            {isAdmin && (
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
                    extraField1Label: 'Ngày đăng',
                    extraField1Value: news.date,
                    extraField2Label: 'Tác giả',
                    extraField2Value: news.author,
                  })
                }
                className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
              >
                Sửa thẻ này
              </button>
            )}

            <div>
              <div className="h-44 overflow-hidden relative">
                <img
                  src={news.imageUrl}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 bg-emerald-900/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-xs">
                  {news.categoryLabel}
                </span>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center text-[11px] text-slate-400 space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{news.date}</span>
                  <span>•</span>
                  <span>{news.author}</span>
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

            <div className="p-5 pt-0">
              <button
                onClick={() => onSelectNews(news)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center"
              >
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
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
                className="absolute top-4 right-4 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="absolute bottom-4 left-4 bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-lg">
                {selectedNews.categoryLabel}
              </span>
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
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg"
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
