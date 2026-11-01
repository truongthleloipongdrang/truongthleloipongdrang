import React, { useState } from 'react';
import {
  Bell,
  Newspaper,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  UserCheck,
  ChevronRight,
  Award,
  Edit,
  Star,
} from 'lucide-react';
import { SiteContent, EditableCardPayload, NavSection, NewsItem } from '../types';

interface HomeSectionProps {
  content: SiteContent;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  onNavigate: (section: NavSection) => void;
  onSelectNews: (newsItem: NewsItem) => void;
  onToggleFeatureNews?: (newsId: string) => void;
  onToggleHighlightActivity?: (activityId: string) => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  content,
  isAdmin,
  onEditCard,
  onNavigate,
  onSelectNews,
  onToggleFeatureNews,
  onToggleHighlightActivity,
}) => {
  // Danh sách các tin tức / thông báo được ghim nổi bật lên Trang Chủ
  const featuredNewsList = content.news.filter((n) => n.isFeatured);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);

  // Ưu tiên bài được ghim nổi bật, nếu không có lấy thông báo hoặc tin đầu tiên
  const currentFeatured =
    featuredNewsList.length > 0
      ? featuredNewsList[activeFeaturedIndex % featuredNewsList.length]
      : content.news.find((n) => n.category === 'thong-bao') || content.news[0];

  // Ưu tiên hiển thị tin được ghim lên đầu lưới tin tức Trang Chủ
  const sortedNewsForHome = [...content.news].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return 0;
  });
  const latestNews = sortedNewsForHome.slice(0, 3);

  // Ưu tiên hiển thị hoạt động có highlight lên đầu mục Trải nghiệm Trang Chủ
  const sortedActivitiesForHome = [...content.activities].sort((a, b) => {
    if (a.highlight && !b.highlight) return -1;
    if (!a.highlight && b.highlight) return 1;
    return 0;
  });
  const highlightedActivities = sortedActivitiesForHome.slice(0, 3);

  const principal = content.principals[0];

  return (
    <div className="space-y-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Tiêu Điểm Nổi Bật Được Ghim Trang Chủ / Thông Báo Khẩn */}
      {currentFeatured && (
        <div
          className={`relative group border rounded-3xl p-5 sm:p-6 shadow-md transition-all ${
            currentFeatured.isFeatured
              ? 'bg-gradient-to-r from-amber-500/20 via-amber-100/40 to-emerald-50 border-amber-400 shadow-amber-200/40'
              : 'bg-gradient-to-r from-amber-500/10 via-emerald-50 to-emerald-100/50 border-emerald-300'
          }`}
        >
          {/* Quick Admin Actions */}
          {isAdmin && (
            <div className="absolute -top-3 right-4 z-20 flex items-center gap-2">
              <button
                onClick={() => onToggleFeatureNews?.(currentFeatured.id)}
                className={`font-black px-3 py-1 rounded-full text-[11px] shadow-md flex items-center space-x-1.5 transition-all ${
                  currentFeatured.isFeatured
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title={
                  currentFeatured.isFeatured
                    ? 'Bỏ ghim bài này khỏi Trang Chủ'
                    : 'Ghim bài này làm Tiêu Điểm Trang Chủ'
                }
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    currentFeatured.isFeatured
                      ? 'fill-slate-950 text-slate-950'
                      : 'text-slate-400'
                  }`}
                />
                <span>
                  {currentFeatured.isFeatured
                    ? '★ Đang Ghim Trang Chủ'
                    : '☆ Ghim Làm Tiêu Điểm'}
                </span>
              </button>

              <button
                onClick={() =>
                  onEditCard({
                    sectionKey: 'news',
                    itemId: currentFeatured.id,
                    title: currentFeatured.title,
                    subtitle: currentFeatured.categoryLabel,
                    content: currentFeatured.content || currentFeatured.summary,
                    imageUrl: currentFeatured.imageUrl,
                    category: currentFeatured.category,
                    isFeatured: currentFeatured.isFeatured,
                    extraField1Label: 'Ngày đăng',
                    extraField1Value: currentFeatured.date,
                    extraField2Label: 'Tác giả',
                    extraField2Value: currentFeatured.author,
                  })
                }
                className="bg-slate-900 hover:bg-black text-white font-bold px-3 py-1 rounded-full text-[11px] shadow-md flex items-center space-x-1"
              >
                <Edit className="w-3 h-3" />
                <span>Sửa bài này</span>
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
              <span
                className={`p-3 rounded-2xl font-bold shrink-0 ${
                  currentFeatured.isFeatured
                    ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse ring-4 ring-amber-300/50'
                    : 'bg-emerald-600 text-white shadow'
                }`}
              >
                {currentFeatured.isFeatured ? (
                  <Star className="w-5 h-5 fill-slate-950" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </span>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full inline-block ${
                      currentFeatured.isFeatured
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {currentFeatured.isFeatured
                      ? '★ TIÊU ĐIỂM NỔI BẬT ĐƯỢC GHIM TRANG CHỦ'
                      : '📢 THÔNG BÁO MỚI NHẤT TỪ NHÀ TRƯỜNG'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {currentFeatured.date} • {currentFeatured.categoryLabel}
                  </span>
                </div>
                <h3
                  className="text-base sm:text-lg font-black text-slate-900 hover:text-emerald-800 transition-colors line-clamp-2 cursor-pointer leading-snug"
                  onClick={() => onSelectNews(currentFeatured)}
                >
                  {currentFeatured.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 sm:line-clamp-1 leading-relaxed">
                  {currentFeatured.summary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-2 sm:pt-0">
              {/* If multiple pinned news, allow switching right here */}
              {featuredNewsList.length > 1 && (
                <div className="flex items-center bg-white/95 border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-bold text-amber-950 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider mr-2 text-slate-500">
                    Ghim ({featuredNewsList.length}):
                  </span>
                  <div className="flex gap-1">
                    {featuredNewsList.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveFeaturedIndex(idx)}
                        className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all ${
                          activeFeaturedIndex % featuredNewsList.length === idx
                            ? 'bg-amber-500 text-slate-950 shadow-xs scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                        }`}
                        title={item.title}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => onSelectNews(currentFeatured)}
                className="inline-flex items-center text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border border-amber-400 px-4 py-2 rounded-xl shadow-xs hover:shadow-md transition-all shrink-0"
              >
                <span>Xem chi tiết ngay</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Message from School Principal */}
      {principal && (
        <section className="relative group bg-white border border-emerald-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'principals',
                  itemId: principal.id,
                  title: principal.name,
                  subtitle: principal.title,
                  content: principal.bio,
                  imageUrl: principal.avatar,
                  extraField1Label: 'Nhiệm vụ',
                  extraField1Value: principal.roleScope,
                  extraField2Label: 'Điểm trường',
                  extraField2Value: principal.campus,
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[11px] shadow-md flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ Hiệu trưởng</span>
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center text-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-emerald-100 shadow-md">
                <img
                  src={principal.avatar}
                  alt={principal.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="mt-3 font-extrabold text-slate-900 text-base">
                {principal.name}
              </h4>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                {principal.title}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {principal.campus}
              </span>
            </div>

            <div className="md:col-span-8 lg:col-span-9 space-y-3">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Thông Điệp Từ Ban Giám Hiệu</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                Xây dựng <span className="inline-block whitespace-nowrap">Trường Tiểu học Lê Lợi</span> - Mái trường hạnh phúc giữa đại ngàn
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                "{principal.bio}"
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-800">
                <span>✓ Kỷ cương - Tình thương - Trách nhiệm</span>
                <span>✓ Giáo dục toàn diện theo CT GDPT 2018</span>
                <span>✓ Đổi mới số hóa & Bảo tồn bản sắc</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Latest News & Announcements (Grid of cards) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-emerald-200 pb-3">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
              CẬP NHẬT HOẠT ĐỘNG
            </span>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-emerald-700" />
              Tin Tức & Hoạt Động Mới Nhất
            </h2>
          </div>
          <button
            onClick={() => onNavigate('news')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center"
          >
            <span>Xem tất cả bản tin</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestNews.map((news) => (
            <div
              key={news.id}
              className={`relative group bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col ${
                news.isFeatured
                  ? 'border-amber-400 ring-2 ring-amber-200/60'
                  : 'border-slate-200 hover:border-emerald-300'
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
                        content: news.content || news.summary,
                        imageUrl: news.imageUrl,
                        category: news.category,
                        isFeatured: news.isFeatured,
                        extraField1Label: 'Ngày đăng',
                        extraField1Value: news.date,
                        extraField2Label: 'Tác giả',
                        extraField2Value: news.author,
                      })
                    }
                    className="bg-slate-900 hover:bg-black text-white font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Sửa</span>
                  </button>
                </div>
              )}

              <div className="h-48 overflow-hidden relative">
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
                <span className="absolute bottom-2.5 left-2.5 bg-emerald-800/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {news.categoryLabel}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-slate-400 space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{news.date}</span>
                    <span>•</span>
                    <span>{news.author}</span>
                  </div>
                  <h3
                    onClick={() => onSelectNews(news)}
                    className="font-bold text-slate-900 text-base line-clamp-2 hover:text-emerald-700 cursor-pointer transition-colors"
                  >
                    {news.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {news.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectNews(news)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center"
                  >
                    Đọc tiếp
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Highlighted Educational Activities & STEM */}
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-emerald-700/60 pb-3">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300">
              TRẢI NGHIỆM HỌC ĐƯỜNG
            </span>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Hoạt Động Giáo Dục & Khởi Nghiệp STEM
            </h2>
          </div>
          <button
            onClick={() => onNavigate('activities')}
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center"
          >
            <span>Khám phá các hoạt động</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {highlightedActivities.map((act) => (
            <div
              key={act.id}
              className={`relative group bg-emerald-950/60 border rounded-2xl overflow-hidden hover:border-amber-400/80 transition-all flex flex-col ${
                act.highlight
                  ? 'border-amber-400/80 ring-2 ring-amber-400/30'
                  : 'border-emerald-700/60'
              }`}
            >
              {isAdmin && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleHighlightActivity?.(act.id)}
                    className={`font-black px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1 transition-all ${
                      act.highlight
                        ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-200'
                        : 'bg-white/90 text-slate-800 hover:bg-emerald-100'
                    }`}
                    title={
                      act.highlight
                        ? 'Hủy nổi bật hoạt động trên Trang Chủ'
                        : 'Làm nổi bật hoạt động trên Trang Chủ'
                    }
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{act.highlight ? 'Đang nổi bật' : 'Nổi bật'}</span>
                  </button>

                  <button
                    onClick={() =>
                      onEditCard({
                        sectionKey: 'activities',
                        itemId: act.id,
                        title: act.title,
                        subtitle: act.categoryLabel,
                        content: act.description,
                        imageUrl: act.imageUrl,
                        category: act.category,
                        highlight: act.highlight,
                        extraField1Label: 'Lịch hoạt động',
                        extraField1Value: act.date,
                      })
                    }
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
                  >
                    Sửa
                  </button>
                </div>
              )}

              <div className="h-40 overflow-hidden relative">
                <img
                  src={act.imageUrl}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {act.highlight && (
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Sparkles className="w-3 h-3" />
                    <span>TIÊU ĐIỂM</span>
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                    {act.categoryLabel}
                  </span>
                  <h4 className="font-bold text-sm text-white line-clamp-2 mt-1">
                    {act.title}
                  </h4>
                  <p className="text-xs text-emerald-100/80 mt-1 line-clamp-3">
                    {act.description}
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-amber-300 font-semibold">
                  Thời gian: {act.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Fast Access Banners: Admissions & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admission Card Teaser */}
        <div
          onClick={() => onNavigate('admissions')}
          className="relative group bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl p-6 shadow-md hover:shadow-xl cursor-pointer transition-all flex flex-col justify-between"
        >
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCard({
                  sectionKey: 'admissionsHomeTeaser',
                  title:
                    content.admissions.homeTeaserTitle ||
                    'Chào Đón Các Em Học Sinh Lớp 1 Đến Trường!',
                  subtitle:
                    content.admissions.homeTeaserTag ||
                    `TUYỂN SINH NĂM HỌC ${content.admissions.academicYear}`,
                  content:
                    content.admissions.homeTeaserDescription ||
                    `Chỉ tiêu ${content.admissions.targetCount} học sinh tại Trường chính và 2 Phân hiệu. Xem hướng dẫn thủ tục, hồ sơ và thời gian tiếp nhận.`,
                  extraField1Label: 'Năm học tuyển sinh',
                  extraField1Value: content.admissions.academicYear,
                  extraField2Label: 'Chỉ tiêu số học sinh',
                  extraField2Value: `${content.admissions.targetCount}`,
                  extraField3Label: 'Dòng chữ trên nút bấm',
                  extraField3Value:
                    content.admissions.homeTeaserButtonText ||
                    'Đăng ký & Xem chi tiết tuyển sinh',
                });
              }}
              className="absolute top-3.5 right-3.5 z-10 bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ này</span>
            </button>
          )}

          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-slate-950/15 px-2.5 py-1 rounded-md inline-block">
              {content.admissions.homeTeaserTag ||
                `TUYỂN SINH NĂM HỌC ${content.admissions.academicYear}`}
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
              {content.admissions.homeTeaserTitle ||
                'Chào Đón Các Em Học Sinh Lớp 1 Đến Trường!'}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-2">
              {content.admissions.homeTeaserDescription ||
                `Chỉ tiêu ${content.admissions.targetCount} học sinh tại Trường chính và 2 Phân hiệu. Xem hướng dẫn thủ tục, hồ sơ và thời gian tiếp nhận.`}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-950/10 flex items-center justify-between font-extrabold text-xs">
            <span>
              {content.admissions.homeTeaserButtonText ||
                'Đăng ký & Xem chi tiết tuyển sinh'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Document Repository Card Teaser */}
        <div
          onClick={() => onNavigate('documents')}
          className="relative group bg-white border-2 border-emerald-600/30 hover:border-emerald-600 text-slate-900 rounded-2xl p-6 shadow-md hover:shadow-xl cursor-pointer transition-all flex flex-col justify-between"
        >
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCard({
                  sectionKey: 'documentsHomeTeaser',
                  title:
                    content.schoolInfo.docsTeaserTitle ||
                    'Tải Giáo Án, Đề Thi & Văn Bản Pháp Quy',
                  subtitle:
                    content.schoolInfo.docsTeaserTag ||
                    'KHO TÀI LIỆU SỐ DÙNG CHUNG',
                  content:
                    content.schoolInfo.docsTeaserDescription ||
                    'Hỗ trợ phụ huynh, học sinh và thầy cô tải xuống và đóng góp tài liệu học tập một cách dễ dàng với tài khoản Gmail.',
                  extraField1Label: 'Dòng chữ trên nút',
                  extraField1Value:
                    content.schoolInfo.docsTeaserButtonText ||
                    'Truy cập kho tài liệu ngay',
                });
              }}
              className="absolute top-3.5 right-3.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ này</span>
            </button>
          )}

          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md inline-block">
              {content.schoolInfo.docsTeaserTag ||
                'KHO TÀI LIỆU SỐ DÙNG CHUNG'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-2 text-slate-900 leading-tight">
              {content.schoolInfo.docsTeaserTitle ||
                'Tải Giáo Án, Đề Thi & Văn Bản Pháp Quy'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              {content.schoolInfo.docsTeaserDescription ||
                'Hỗ trợ phụ huynh, học sinh và thầy cô tải xuống và đóng góp tài liệu học tập một cách dễ dàng với tài khoản Gmail.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between font-bold text-xs text-emerald-700">
            <span>
              {content.schoolInfo.docsTeaserButtonText ||
                'Truy cập kho tài liệu ngay'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
