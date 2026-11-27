import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
  Newspaper,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Home,
  Info,
  Users,
  GraduationCap,
  Phone,
  Layers,
  ExternalLink,
  EyeOff,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import {
  ACTIVITY_SUB_SCOPES,
  ActivityCategorySlug,
  EditablePublicSectionId,
  FirestoreActivityItem,
  FirestoreDocumentRecord,
  FirestoreGalleryRecord,
  FirestoreNewsItem,
  FirestoreSectionContentRecord,
  GranularPublicBundle,
  MAIN_SECTION_SCOPES,
  MainSectionScopeKey,
  PublishStatus,
  UserRoleRecord,
  canDeleteItem,
  canEditItem,
  canPerformScopeAction,
  getAllowedActivityCategories,
  getGrantedMainSections,
  isAdminOrSuperAdminRecord,
} from '../rbacTypes';
import {
  fetchEditorialWorkspaceBundle,
  saveEditorialNewsItem,
  deleteEditorialNewsItem,
  saveEditorialActivityItem,
  deleteEditorialActivityItem,
  saveEditorialGalleryItem,
  deleteEditorialGalleryItem,
  saveEditorialDocumentItem,
  deleteEditorialDocumentItem,
  saveEditorialSectionContent,
  deleteEditorialSectionContent,
} from '../rbacStore';
import { GalleryAlbumPhoto, MemberUser, SiteContent } from '../types';
import { ALLOWED_DOCUMENT_FILE_TYPES } from '../urlValidation';
import { ImageUrlPreview } from './ImageUrlPreview';

interface TeacherContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleRecord: UserRoleRecord;
  currentMember: MemberUser | null;
  siteContent: SiteContent;
  initialSection?: MainSectionScopeKey;
  onContentMutated: () => Promise<void>;
}

const NEWS_CATEGORIES: { id: FirestoreNewsItem['category']; label: string }[] = [
  { id: 'tin-tuc', label: 'Tin Tức Nhà Trường' },
  { id: 'thong-bao', label: 'Thông Báo Quan Trọng' },
  { id: 'hoat-dong', label: 'Hoạt Động Nổi Bật' },
  { id: 'chuyen-doi-so', label: 'Chuyển Đổi Số' },
];

const DOC_CATEGORIES: { id: FirestoreDocumentRecord['category']; label: string }[] = [
  { id: 'giao-an', label: 'Giáo Án & Phân Phối' },
  { id: 'de-thi', label: 'Đề Thi & Đáp Án' },
  { id: 'van-ban', label: 'Thông Tư & Văn Bản' },
  { id: 'tap-huan', label: 'Tập Huấn GDPT 2018' },
  { id: 'stem', label: 'Bài Giảng STEM' },
  { id: 'hoc-sinh', label: 'Học Sinh Ôn Luyện' },
  { id: 'chuyen-de', label: 'Chuyên Đề Bồi Dưỡng' },
  { id: 'ke-hoach', label: 'Kế Hoạch Giáo Dục' },
];

const GALLERY_CATEGORIES = [
  { id: 'hoat-dong', label: 'Hoạt động nhà trường' },
  { id: 'van-nghe', label: 'Văn nghệ & Ngày lễ' },
  { id: 'the-thao', label: 'Thể thao & Hội khỏe' },
  { id: 'co-so-vat-chat', label: 'Cơ sở vật chất' },
  { id: 'stem-trai-nghiem', label: 'STEM & Trải nghiệm' },
  { id: 'doi-tntp', label: 'Công tác Đội' },
];

const SECTION_ICONS: Record<MainSectionScopeKey, React.FC<{ className?: string }>> = {
  home: Home,
  about: Info,
  staff: Users,
  news: Newspaper,
  activities: Sparkles,
  admissions: GraduationCap,
  gallery: ImageIcon,
  documents: BookOpen,
  contact: Phone,
  other: Layers,
};

export const TeacherContentModal: React.FC<TeacherContentModalProps> = ({
  isOpen,
  onClose,
  roleRecord,
  currentMember,
  siteContent,
  initialSection,
  onContentMutated,
}) => {
  const grantedSections = useMemo(() => getGrantedMainSections(roleRecord), [roleRecord]);
  const isAdminActor = isAdminOrSuperAdminRecord(roleRecord);

  const [activeSection, setActiveSection] = useState<MainSectionScopeKey>(() => {
    if (initialSection && grantedSections.includes(initialSection)) return initialSection;
    return grantedSections[0] || 'news';
  });

  const [bundle, setBundle] = useState<GranularPublicBundle>({
    newsItems: [],
    activityItems: [],
    galleryItems: [],
    documentItems: [],
    sectionContents: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync activeSection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialSection && grantedSections.includes(initialSection)) {
      setActiveSection(initialSection);
    } else if (grantedSections.length > 0 && !grantedSections.includes(activeSection)) {
      setActiveSection(grantedSections[0]);
    }
  }, [isOpen, initialSection, grantedSections, activeSection]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const data = await fetchEditorialWorkspaceBundle(isAdminActor);
      setBundle(data);
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể tải dữ liệu không gian biên tập từ Firebase.',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdminActor]);

  useEffect(() => {
    if (isOpen) {
      void loadWorkspace();
    }
  }, [isOpen, loadWorkspace]);

  // =================== NEWS FORM STATE ===================
  const [editingNews, setEditingNews] = useState<FirestoreNewsItem | null>(null);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<FirestoreNewsItem['category']>('tin-tuc');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsDate, setNewsDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [newsAuthor, setNewsAuthor] = useState(currentMember?.name || roleRecord.displayName || '');
  const [newsExternalUrl, setNewsExternalUrl] = useState('');
  const [newsSourceName, setNewsSourceName] = useState('');
  const [newsFeatured, setNewsFeatured] = useState(false);

  const openNewsCreate = () => {
    setEditingNews(null);
    setNewsTitle('');
    setNewsCategory('tin-tuc');
    setNewsSummary('');
    setNewsContent('');
    setNewsImageUrl('');
    setNewsDate(new Date().toLocaleDateString('vi-VN'));
    setNewsAuthor(currentMember?.name || roleRecord.displayName || roleRecord.email);
    setNewsExternalUrl('');
    setNewsSourceName('');
    setNewsFeatured(false);
    setShowNewsForm(true);
    setBanner(null);
  };

  const openNewsEdit = (item: FirestoreNewsItem) => {
    setEditingNews(item);
    setNewsTitle(item.title);
    setNewsCategory(item.category);
    setNewsSummary(item.summary);
    setNewsContent(item.content);
    setNewsImageUrl(item.imageUrl);
    setNewsDate(item.date);
    setNewsAuthor(item.author);
    setNewsExternalUrl(item.externalUrl || '');
    setNewsSourceName(item.sourceName || '');
    setNewsFeatured(Boolean(item.isFeatured));
    setShowNewsForm(true);
    setBanner(null);
  };

  const submitNews = async (status: PublishStatus) => {
    setSaving(true);
    setBanner(null);
    try {
      const catMeta = NEWS_CATEGORIES.find((c) => c.id === newsCategory);
      await saveEditorialNewsItem(
        {
          title: newsTitle,
          category: newsCategory,
          categoryLabel: catMeta?.label || 'Tin Tức',
          summary: newsSummary,
          content: newsContent,
          date: newsDate,
          author: newsAuthor,
          imageUrl: newsImageUrl,
          isFeatured: newsFeatured,
          isExternalLink: Boolean(newsExternalUrl.trim()),
          externalUrl: newsExternalUrl.trim() || undefined,
          sourceName: newsSourceName.trim() || undefined,
          status,
        },
        editingNews
      );
      setShowNewsForm(false);
      setEditingNews(null);
      await loadWorkspace();
      await onContentMutated();
      setBanner({
        type: 'success',
        text:
          status === 'published'
            ? 'Đã xuất bản trực tiếp bài viết lên mục Tin tức & Thông báo!'
            : 'Đã lưu bản nháp cá nhân thành công (chưa hiển thị công khai).',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Không thể lưu bài viết.' });
    } finally {
      setSaving(false);
    }
  };

  // =================== ACTIVITIES FORM STATE ===================
  const allowedCreateActCategories = useMemo(
    () => getAllowedActivityCategories(roleRecord, 'CREATE'),
    [roleRecord]
  );
  const allowedAnyActCategories = useMemo(
    () => getAllowedActivityCategories(roleRecord),
    [roleRecord]
  );

  const [editingActivity, setEditingActivity] = useState<FirestoreActivityItem | null>(null);
  const [showActForm, setShowActForm] = useState(false);
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState<ActivityCategorySlug>(
    () => allowedCreateActCategories[0] || allowedAnyActCategories[0] || 'day-hoc'
  );
  const [actDate, setActDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [actDesc, setActDesc] = useState('');
  const [actContent, setActContent] = useState('');
  const [actImageUrl, setActImageUrl] = useState('');
  const [actExtraImagesText, setActExtraImagesText] = useState('');
  const [actVideoUrl, setActVideoUrl] = useState('');
  const [actHighlight, setActHighlight] = useState(false);

  const openActCreate = () => {
    setEditingActivity(null);
    setActTitle('');
    setActCategory(allowedCreateActCategories[0] || 'day-hoc');
    setActDate(new Date().toLocaleDateString('vi-VN'));
    setActDesc('');
    setActContent('');
    setActImageUrl('');
    setActExtraImagesText('');
    setActVideoUrl('');
    setActHighlight(false);
    setShowActForm(true);
    setBanner(null);
  };

  const openActEdit = (item: FirestoreActivityItem) => {
    setEditingActivity(item);
    setActTitle(item.title);
    setActCategory(item.category);
    setActDate(item.date);
    setActDesc(item.description);
    setActContent(item.content || '');
    setActImageUrl(item.imageUrl);
    setActExtraImagesText((item.images || []).join('\n'));
    setActVideoUrl(item.videoUrl || '');
    setActHighlight(Boolean(item.highlight));
    setShowActForm(true);
    setBanner(null);
  };

  const submitActivity = async (status: PublishStatus) => {
    setSaving(true);
    setBanner(null);
    try {
      const subDef = ACTIVITY_SUB_SCOPES.find((s) => s.categorySlug === actCategory);
      const extraImages = actExtraImagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await saveEditorialActivityItem(
        {
          title: actTitle,
          category: actCategory,
          categoryLabel: subDef?.label || 'Hoạt động',
          date: actDate,
          description: actDesc,
          content: actContent,
          imageUrl: actImageUrl,
          images: extraImages,
          videoUrl: actVideoUrl.trim() || undefined,
          highlight: actHighlight,
          status,
        },
        editingActivity
      );
      setShowActForm(false);
      setEditingActivity(null);
      await loadWorkspace();
      await onContentMutated();
      setBanner({
        type: 'success',
        text:
          status === 'published'
            ? `Đã xuất bản trực tiếp hoạt động vào danh mục "${subDef?.label || actCategory}"!`
            : 'Đã lưu bản nháp hoạt động cá nhân.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Không thể lưu hoạt động.' });
    } finally {
      setSaving(false);
    }
  };

  // =================== GALLERY FORM STATE ===================
  const [editingGallery, setEditingGallery] = useState<FirestoreGalleryRecord | null>(null);
  const [showGalForm, setShowGalForm] = useState(false);
  const [galType, setGalType] = useState<'photo' | 'album'>('photo');
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState('hoat-dong');
  const [galDate, setGalDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [galImageUrl, setGalImageUrl] = useState('');
  const [galCaption, setGalCaption] = useState('');
  const [galAlbumPhotos, setGalAlbumPhotos] = useState<GalleryAlbumPhoto[]>([]);
  const [newAlbumPhotoUrl, setNewAlbumPhotoUrl] = useState('');
  const [newAlbumPhotoCaption, setNewAlbumPhotoCaption] = useState('');

  const openGalCreate = (type: 'photo' | 'album') => {
    setEditingGallery(null);
    setGalType(type);
    setGalTitle('');
    setGalCategory('hoat-dong');
    setGalDate(new Date().toLocaleDateString('vi-VN'));
    setGalImageUrl('');
    setGalCaption('');
    setGalAlbumPhotos([]);
    setNewAlbumPhotoUrl('');
    setNewAlbumPhotoCaption('');
    setShowGalForm(true);
    setBanner(null);
  };

  const openGalEdit = (item: FirestoreGalleryRecord) => {
    setEditingGallery(item);
    setGalType(item.itemType);
    setGalTitle(item.title);
    setGalCategory(item.category);
    setGalDate(item.date);
    setGalImageUrl(item.imageUrl);
    setGalCaption(item.caption);
    setGalAlbumPhotos(item.photos ? [...item.photos] : []);
    setNewAlbumPhotoUrl('');
    setNewAlbumPhotoCaption('');
    setShowGalForm(true);
    setBanner(null);
  };

  const handleAddAlbumPhoto = () => {
    const url = newAlbumPhotoUrl.trim();
    if (!url) return;
    setGalAlbumPhotos((prev) => [
      ...prev,
      {
        id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: url,
        caption: newAlbumPhotoCaption.trim() || undefined,
      },
    ]);
    if (!galImageUrl.trim()) {
      setGalImageUrl(url);
    }
    setNewAlbumPhotoUrl('');
    setNewAlbumPhotoCaption('');
  };

  const submitGallery = async (status: PublishStatus) => {
    setSaving(true);
    setBanner(null);
    try {
      await saveEditorialGalleryItem(
        {
          itemType: galType,
          title: galTitle,
          category: galCategory,
          date: galDate,
          imageUrl: galImageUrl,
          caption: galCaption,
          photos: galType === 'album' ? galAlbumPhotos : undefined,
          status,
        },
        editingGallery
      );
      setShowGalForm(false);
      setEditingGallery(null);
      await loadWorkspace();
      await onContentMutated();
      setBanner({
        type: 'success',
        text:
          status === 'published'
            ? `Đã xuất bản trực tiếp ${galType === 'album' ? 'album ảnh' : 'hình ảnh'} lên Thư Viện Ảnh!`
            : 'Đã lưu bản nháp thư viện ảnh.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Không thể lưu mục Thư viện ảnh.' });
    } finally {
      setSaving(false);
    }
  };

  // =================== DOCUMENTS FORM STATE (DIRECT PUBLISH) ===================
  const [editingDoc, setEditingDoc] = useState<FirestoreDocumentRecord | null>(null);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<FirestoreDocumentRecord['category']>('giao-an');
  const [docDesc, setDocDesc] = useState('');
  const [docFileType, setDocFileType] = useState('PDF');
  const [docFileSize, setDocFileSize] = useState('Liên kết trực tuyến');
  const [docUrl, setDocUrl] = useState('');

  const openDocCreate = () => {
    setEditingDoc(null);
    setDocTitle('');
    setDocCategory('giao-an');
    setDocDesc('');
    setDocFileType('PDF');
    setDocFileSize('Liên kết trực tuyến');
    setDocUrl('');
    setShowDocForm(true);
    setBanner(null);
  };

  const openDocEdit = (item: FirestoreDocumentRecord) => {
    setEditingDoc(item);
    setDocTitle(item.title);
    setDocCategory(item.category);
    setDocDesc(item.description);
    setDocFileType(item.fileType);
    setDocFileSize(item.fileSize);
    setDocUrl(item.downloadUrl);
    setShowDocForm(true);
    setBanner(null);
  };

  const submitDocument = async (status: PublishStatus) => {
    setSaving(true);
    setBanner(null);
    try {
      const catMeta = DOC_CATEGORIES.find((c) => c.id === docCategory);
      await saveEditorialDocumentItem(
        {
          title: docTitle,
          category: docCategory,
          categoryLabel: catMeta?.label || 'Giáo Án & Phân Phối',
          description: docDesc,
          fileType: docFileType,
          fileSize: docFileSize,
          downloadUrl: docUrl,
          uploaderName: currentMember?.name || roleRecord.displayName || roleRecord.email,
          status,
        },
        editingDoc
      );
      setShowDocForm(false);
      setEditingDoc(null);
      await loadWorkspace();
      await onContentMutated();
      setBanner({
        type: 'success',
        text:
          status === 'published'
            ? 'Đã đăng trực tiếp tài liệu vào Kho Tài Liệu công khai!'
            : 'Đã lưu bản nháp tài liệu cá nhân.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Không thể lưu tài liệu.' });
    } finally {
      setSaving(false);
    }
  };

  // =================== GENERIC PUBLIC SECTION EDITOR (home, about, staff, admissions, contact, other) ===================
  const currentSectionDoc = useMemo<FirestoreSectionContentRecord | null>(() => {
    if (['home', 'about', 'staff', 'admissions', 'contact', 'other'].includes(activeSection)) {
      return bundle.sectionContents.find((s) => s.sectionId === activeSection) || null;
    }
    return null;
  }, [bundle.sectionContents, activeSection]);

  const [secField1, setSecField1] = useState('');
  const [secField2, setSecField2] = useState('');
  const [secField3, setSecField3] = useState('');
  const [secField4, setSecField4] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const p = (currentSectionDoc?.payload || {}) as Record<string, string>;
    if (activeSection === 'home') {
      setSecField1(p.slogan ?? siteContent.schoolInfo.slogan);
      setSecField2(p.heroDescription ?? siteContent.schoolInfo.heroDescription);
      setSecField3(p.scheduleTitle ?? siteContent.schoolInfo.scheduleTitle ?? '');
      setSecField4(p.scheduleDescription ?? siteContent.schoolInfo.scheduleDescription ?? '');
    } else if (activeSection === 'about') {
      setSecField1(p.historyTitle ?? siteContent.historyTitle ?? '');
      setSecField2(p.history ?? siteContent.history ?? '');
      setSecField3(p.mission ?? siteContent.mission ?? '');
      setSecField4(p.vision ?? siteContent.vision ?? '');
    } else if (activeSection === 'staff') {
      setSecField1(p.leadershipText ?? siteContent.schoolInfo.leadershipText ?? '');
      setSecField2(p.staffNotice ?? '');
      setSecField3(p.mainCampusLeader ?? siteContent.schoolInfo.mainCampusLeader ?? '');
      setSecField4('');
    } else if (activeSection === 'admissions') {
      setSecField1(p.headerTitle ?? siteContent.admissions.headerTitle ?? '');
      setSecField2(p.bannerDescription ?? siteContent.admissions.bannerDescription ?? '');
      setSecField3(p.hotline ?? siteContent.admissions.hotline ?? '');
      setSecField4(p.notes ?? siteContent.admissions.notes ?? '');
    } else if (activeSection === 'contact') {
      setSecField1(p.phone ?? siteContent.schoolInfo.phone ?? '');
      setSecField2(p.email ?? siteContent.schoolInfo.email ?? '');
      setSecField3(p.fullAddress ?? siteContent.schoolInfo.fullAddress ?? '');
      setSecField4(p.scheduleReceptionTime ?? siteContent.schoolInfo.scheduleReceptionTime ?? '');
    } else if (activeSection === 'other') {
      setSecField1(p.docsTeaserTitle ?? siteContent.schoolInfo.docsTeaserTitle ?? '');
      setSecField2(p.docsTeaserDescription ?? siteContent.schoolInfo.docsTeaserDescription ?? '');
      setSecField3(p.announcementBanner ?? '');
      setSecField4('');
    }
  }, [isOpen, activeSection, currentSectionDoc, siteContent]);

  const submitSectionContent = async (status: PublishStatus) => {
    const secId = activeSection as EditablePublicSectionId;
    setSaving(true);
    setBanner(null);
    try {
      let payload: Record<string, unknown> = {};
      if (secId === 'home') {
        payload = {
          slogan: secField1.trim(),
          heroDescription: secField2.trim(),
          scheduleTitle: secField3.trim(),
          scheduleDescription: secField4.trim(),
        };
      } else if (secId === 'about') {
        payload = {
          historyTitle: secField1.trim(),
          history: secField2.trim(),
          mission: secField3.trim(),
          vision: secField4.trim(),
        };
      } else if (secId === 'staff') {
        payload = {
          leadershipText: secField1.trim(),
          staffNotice: secField2.trim(),
          mainCampusLeader: secField3.trim(),
        };
      } else if (secId === 'admissions') {
        payload = {
          headerTitle: secField1.trim(),
          bannerDescription: secField2.trim(),
          hotline: secField3.trim(),
          notes: secField4.trim(),
        };
      } else if (secId === 'contact') {
        payload = {
          phone: secField1.trim(),
          email: secField2.trim(),
          fullAddress: secField3.trim(),
          scheduleReceptionTime: secField4.trim(),
        };
      } else {
        payload = {
          docsTeaserTitle: secField1.trim(),
          docsTeaserDescription: secField2.trim(),
          announcementBanner: secField3.trim(),
        };
      }

      await saveEditorialSectionContent(secId, payload, status, currentSectionDoc);
      await loadWorkspace();
      await onContentMutated();
      setBanner({
        type: 'success',
        text:
          status === 'published'
            ? `Đã cập nhật và xuất bản trực tiếp nội dung mục "${MAIN_SECTION_SCOPES.find((s) => s.key === secId)?.label || secId}"!`
            : 'Đã lưu bản nháp cá nhân cho mục này.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Không thể lưu nội dung mục này.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const canCreateNews = canPerformScopeAction(roleRecord, 'news', 'CREATE');
  const canCreateActivity = allowedCreateActCategories.length > 0;
  const canCreateGallery = canPerformScopeAction(roleRecord, 'gallery', 'CREATE');
  const canCreateDoc = canPerformScopeAction(roleRecord, 'documents', 'CREATE');

  const visibleActivities = bundle.activityItems.filter((item) =>
    isAdminActor || allowedAnyActCategories.includes(item.category)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl border border-emerald-200 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base truncate">
                Không Gian Quản Lý Nội Dung Giáo Viên
              </h2>
              <p className="text-[11px] text-emerald-200 truncate">
                {currentMember?.name || roleRecord.displayName || roleRecord.email} ({roleRecord.email}) • Đăng trực tiếp trong {grantedSections.length} mục được cấp quyền
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadWorkspace()}
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Đóng không gian quản lý nội dung"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar: ONLY granted sections */}
          <aside className="w-full md:w-60 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
            <div className="hidden md:block text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pb-1">
              Mục Được Cấp Quyền ({grantedSections.length})
            </div>
            {grantedSections.map((secKey) => {
              const def = MAIN_SECTION_SCOPES.find((s) => s.key === secKey);
              const Icon = SECTION_ICONS[secKey] || FileText;
              const active = activeSection === secKey;
              return (
                <button
                  key={secKey}
                  type="button"
                  onClick={() => {
                    setActiveSection(secKey);
                    setBanner(null);
                    setShowNewsForm(false);
                    setShowActForm(false);
                    setShowGalForm(false);
                    setShowDocForm(false);
                  }}
                  className={`flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span className="truncate">{def?.label || secKey}</span>
                </button>
              );
            })}

            <div className="hidden md:block mt-auto pt-3 border-t border-slate-200 text-[11px] text-slate-500 px-2 leading-relaxed">
              Mọi bài viết và tài liệu xuất bản tại đây sẽ hiển thị <strong>trực tiếp</strong> lên website và được ghi nhật ký biên tập tự động.
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {banner && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2 ${
                  banner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                {banner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{banner.text}</span>
              </div>
            )}

            {grantedSections.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Tài khoản của bạn hiện chưa được cấp quyền biên tập cho mục nào.
              </div>
            ) : (
              <>
                {/* ==================== 1. NEWS ==================== */}
                {activeSection === 'news' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Tin Tức &amp; Thông Báo ({bundle.newsItems.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Đăng tin trực tiếp sử dụng URL ảnh ImageKit.io (https://...).
                        </p>
                      </div>
                      {canCreateNews && (
                        <button
                          type="button"
                          onClick={openNewsCreate}
                          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Viết Tin Mới</span>
                        </button>
                      )}
                    </div>

                    {showNewsForm && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-emerald-950">
                            {editingNews ? 'Chỉnh Sửa Bài Viết' : 'Soạn Tin Tức / Thông Báo Mới'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowNewsForm(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tiêu đề bài viết *
                            </label>
                            <input
                              type="text"
                              value={newsTitle}
                              onChange={(e) => setNewsTitle(e.target.value)}
                              placeholder="Nhập tiêu đề bài viết..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên mục</label>
                            <select
                              value={newsCategory}
                              onChange={(e) =>
                                setNewsCategory(e.target.value as FirestoreNewsItem['category'])
                              }
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            >
                              {NEWS_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày đăng</label>
                            <input
                              type="text"
                              value={newsDate}
                              onChange={(e) => setNewsDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tác giả / Nguồn</label>
                            <input
                              type="text"
                              value={newsAuthor}
                              onChange={(e) => setNewsAuthor(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Link bài báo ngoài (tùy chọn, https://...)
                            </label>
                            <input
                              type="url"
                              value={newsExternalUrl}
                              onChange={(e) => setNewsExternalUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              URL Ảnh đại diện từ ImageKit.io (https://...) *
                            </label>
                            <input
                              type="url"
                              value={newsImageUrl}
                              onChange={(e) => setNewsImageUrl(e.target.value)}
                              placeholder="https://ik.imagekit.io/..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white mb-2"
                            />
                            <ImageUrlPreview url={newsImageUrl} alt={newsTitle} aspectClass="h-40" />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tóm tắt ngắn</label>
                            <textarea
                              rows={2}
                              value={newsSummary}
                              onChange={(e) => setNewsSummary(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết *</label>
                            <textarea
                              rows={5}
                              value={newsContent}
                              onChange={(e) => setNewsContent(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-center gap-2">
                            <input
                              id="teacher-news-featured"
                              type="checkbox"
                              checked={newsFeatured}
                              onChange={(e) => setNewsFeatured(e.target.checked)}
                              className="w-4 h-4 accent-emerald-700"
                            />
                            <label htmlFor="teacher-news-featured" className="text-xs font-semibold text-slate-700">
                              Ghim tin nổi bật lên Trang chủ
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-emerald-200">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitNews('draft')}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Lưu Bản Nháp</span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitNews('published')}
                            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{saving ? 'Đang lưu...' : 'Xuất Bản Trực Tiếp'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {bundle.newsItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                          Chưa có bài viết nào trong không gian xuất bản trực tiếp.
                        </div>
                      ) : (
                        bundle.newsItems.map((item) => {
                          const canEdit = canEditItem(roleRecord, 'news', item.authorUid);
                          const canDel = canDeleteItem(roleRecord, 'news', item.authorUid);
                          return (
                            <div
                              key={item.id}
                              className="border border-slate-200 rounded-2xl p-3.5 bg-white flex flex-col sm:flex-row gap-3 justify-between"
                            >
                              <div className="flex gap-3 min-w-0">
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    className="w-20 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                                  />
                                )}
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                                      {item.categoryLabel}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        item.status === 'published'
                                          ? 'bg-sky-50 text-sky-800'
                                          : 'bg-amber-100 text-amber-950'
                                      }`}
                                    >
                                      {item.status === 'published' ? 'Công khai' : 'Bản nháp'}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-sm text-slate-900 line-clamp-1">
                                    {item.title}
                                  </h5>
                                  <div className="text-[11px] text-slate-500">
                                    {item.date} • Đăng bởi: <strong>{item.authorEmail}</strong>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openNewsEdit(item)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-emerald-100 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                )}
                                {canDel &&
                                  (confirmDeleteId === item.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await deleteEditorialNewsItem(item);
                                            setConfirmDeleteId(null);
                                            await loadWorkspace();
                                            await onContentMutated();
                                            setBanner({ type: 'success', text: `Đã xóa bài viết "${item.title}".` });
                                          } catch (err: any) {
                                            setBanner({ type: 'error', text: err?.message || 'Không thể xóa bài viết.' });
                                          }
                                        }}
                                        className="bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                      >
                                        Xác nhận xóa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1.5 rounded-xl cursor-pointer"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(item.id)}
                                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Xóa</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== 2. ACTIVITIES ==================== */}
                {activeSection === 'activities' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Quản Lý Hoạt Động ({visibleActivities.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Danh mục được cấp quyền:{' '}
                          <strong className="text-emerald-800">
                            {allowedAnyActCategories
                              .map((slug) => ACTIVITY_SUB_SCOPES.find((s) => s.categorySlug === slug)?.label || slug)
                              .join(', ')}
                          </strong>
                        </p>
                      </div>
                      {canCreateActivity && (
                        <button
                          type="button"
                          onClick={openActCreate}
                          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Thêm Hoạt Động Mới</span>
                        </button>
                      )}
                    </div>

                    {showActForm && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-emerald-950">
                            {editingActivity ? 'Chỉnh Sửa Hoạt Động' : 'Đăng Hoạt Động Mới'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowActForm(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tiêu đề hoạt động *
                            </label>
                            <input
                              type="text"
                              value={actTitle}
                              onChange={(e) => setActTitle(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Danh mục hoạt động (chỉ hiển thị danh mục được cấp quyền) *
                            </label>
                            <select
                              value={actCategory}
                              onChange={(e) => setActCategory(e.target.value as ActivityCategorySlug)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white font-bold"
                            >
                              {(editingActivity ? allowedAnyActCategories : allowedCreateActCategories).map(
                                (slug) => {
                                  const def = ACTIVITY_SUB_SCOPES.find((s) => s.categorySlug === slug);
                                  return (
                                    <option key={slug} value={slug}>
                                      {def?.label || slug}
                                    </option>
                                  );
                                }
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày tổ chức</label>
                            <input
                              type="text"
                              value={actDate}
                              onChange={(e) => setActDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              URL Ảnh đại diện ImageKit.io (https://...) *
                            </label>
                            <input
                              type="url"
                              value={actImageUrl}
                              onChange={(e) => setActImageUrl(e.target.value)}
                              placeholder="https://ik.imagekit.io/..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white mb-2"
                            />
                            <ImageUrlPreview url={actImageUrl} alt={actTitle} aspectClass="h-40" />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Mô tả ngắn *
                            </label>
                            <textarea
                              rows={2}
                              value={actDesc}
                              onChange={(e) => setActDesc(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Nội dung chi tiết hoạt động
                            </label>
                            <textarea
                              rows={4}
                              value={actContent}
                              onChange={(e) => setActContent(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Ảnh phụ ImageKit.io (mỗi dòng 1 URL)
                            </label>
                            <textarea
                              rows={3}
                              value={actExtraImagesText}
                              onChange={(e) => setActExtraImagesText(e.target.value)}
                              placeholder="https://ik.imagekit.io/..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                            />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Link video YouTube (tùy chọn)
                              </label>
                              <input
                                type="url"
                                value={actVideoUrl}
                                onChange={(e) => setActVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={actHighlight}
                                onChange={(e) => setActHighlight(e.target.checked)}
                                className="w-4 h-4 accent-emerald-700"
                              />
                              <span>Đưa hoạt động nổi bật lên Trang chủ</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-emerald-200">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitActivity('draft')}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Lưu Bản Nháp</span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitActivity('published')}
                            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{saving ? 'Đang lưu...' : 'Xuất Bản Trực Tiếp'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {visibleActivities.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                          Chưa có hoạt động nào trong các danh mục bạn phụ trách.
                        </div>
                      ) : (
                        visibleActivities.map((item) => {
                          const scopeKey = `activities:${item.category}` as const;
                          const canEdit = canEditItem(roleRecord, scopeKey, item.authorUid);
                          const canDel = canDeleteItem(roleRecord, scopeKey, item.authorUid);
                          return (
                            <div
                              key={item.id}
                              className="border border-slate-200 rounded-2xl p-3.5 bg-white flex flex-col sm:flex-row gap-3 justify-between"
                            >
                              <div className="flex gap-3 min-w-0">
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    className="w-20 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                                  />
                                )}
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                                      {item.categoryLabel}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        item.status === 'published'
                                          ? 'bg-sky-50 text-sky-800'
                                          : 'bg-amber-100 text-amber-950'
                                      }`}
                                    >
                                      {item.status === 'published' ? 'Công khai' : 'Bản nháp'}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-sm text-slate-900 line-clamp-1">
                                    {item.title}
                                  </h5>
                                  <div className="text-[11px] text-slate-500">
                                    {item.date} • Đăng bởi: <strong>{item.authorEmail}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openActEdit(item)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-emerald-100 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                )}
                                {canDel &&
                                  (confirmDeleteId === item.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await deleteEditorialActivityItem(item);
                                            setConfirmDeleteId(null);
                                            await loadWorkspace();
                                            await onContentMutated();
                                            setBanner({ type: 'success', text: `Đã xóa hoạt động "${item.title}".` });
                                          } catch (err: any) {
                                            setBanner({ type: 'error', text: err?.message || 'Không thể xóa hoạt động.' });
                                          }
                                        }}
                                        className="bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                      >
                                        Xác nhận xóa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1.5 rounded-xl cursor-pointer"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(item.id)}
                                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Xóa</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== 3. GALLERY ==================== */}
                {activeSection === 'gallery' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Thư Viện Ảnh &amp; Album ({bundle.galleryItems.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Dán URL ảnh từ ImageKit.io (https://...) — tự động xem trước trực quan.
                        </p>
                      </div>
                      {canCreateGallery && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openGalCreate('photo')}
                            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Thêm Ảnh Đơn</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openGalCreate('album')}
                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tạo Album Ảnh</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {showGalForm && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-emerald-950">
                            {editingGallery
                              ? `Chỉnh Sửa ${galType === 'album' ? 'Album Ảnh' : 'Ảnh Thư Viện'}`
                              : galType === 'album'
                              ? 'Tạo Album Ảnh Mới'
                              : 'Đăng Ảnh Mới Lên Thư Viện'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowGalForm(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tiêu đề {galType === 'album' ? 'album' : 'hình ảnh'} *
                            </label>
                            <input
                              type="text"
                              value={galTitle}
                              onChange={(e) => setGalTitle(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục</label>
                            <select
                              value={galCategory}
                              onChange={(e) => setGalCategory(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            >
                              {GALLERY_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày chụp / đăng</label>
                            <input
                              type="text"
                              value={galDate}
                              onChange={(e) => setGalDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              URL Ảnh {galType === 'album' ? 'đại diện album' : ''} ImageKit.io (https://...) *
                            </label>
                            <input
                              type="url"
                              value={galImageUrl}
                              onChange={(e) => setGalImageUrl(e.target.value)}
                              placeholder="https://ik.imagekit.io/..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white mb-2"
                            />
                            <ImageUrlPreview url={galImageUrl} alt={galTitle} aspectClass="h-44" />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả</label>
                            <textarea
                              rows={2}
                              value={galCaption}
                              onChange={(e) => setGalCaption(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          {galType === 'album' && (
                            <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 space-y-2.5">
                              <div className="text-xs font-bold text-slate-800">
                                Danh sách ảnh trong album ({galAlbumPhotos.length} ảnh)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="url"
                                  value={newAlbumPhotoUrl}
                                  onChange={(e) => setNewAlbumPhotoUrl(e.target.value)}
                                  placeholder="Dán URL ảnh ImageKit.io..."
                                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                                />
                                <input
                                  type="text"
                                  value={newAlbumPhotoCaption}
                                  onChange={(e) => setNewAlbumPhotoCaption(e.target.value)}
                                  placeholder="Chú thích ảnh (tùy chọn)"
                                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddAlbumPhoto}
                                className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm ảnh vào album</span>
                              </button>

                              {galAlbumPhotos.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                  {galAlbumPhotos.map((p, idx) => (
                                    <div key={p.id || idx} className="relative border rounded-lg overflow-hidden bg-slate-50">
                                      <img
                                        src={p.imageUrl}
                                        alt={p.caption || `Ảnh ${idx + 1}`}
                                        className="w-full h-20 object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setGalAlbumPhotos((prev) => prev.filter((_, i) => i !== idx))
                                        }
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
                                        title="Xóa ảnh khỏi album"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-emerald-200">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitGallery('draft')}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Lưu Bản Nháp</span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitGallery('published')}
                            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{saving ? 'Đang lưu...' : 'Xuất Bản Trực Tiếp'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {bundle.galleryItems.map((item) => {
                        const canEdit = canEditItem(roleRecord, 'gallery', item.authorUid);
                        const canDel = canDeleteItem(roleRecord, 'gallery', item.authorUid);
                        return (
                          <div key={item.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col">
                            <img src={item.imageUrl} alt={item.title} className="w-full h-36 object-cover" />
                            <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1 text-[10px]">
                                  <span className="font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                                    {item.itemType === 'album' ? `Album (${item.photos?.length || 0} ảnh)` : 'Ảnh đơn'}
                                  </span>
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded-full ${
                                      item.status === 'published'
                                        ? 'bg-sky-50 text-sky-800'
                                        : 'bg-amber-100 text-amber-950'
                                    }`}
                                  >
                                    {item.status === 'published' ? 'Công khai' : 'Nháp'}
                                  </span>
                                </div>
                                <h5 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                                  {item.title}
                                </h5>
                                <div className="text-[10px] text-slate-500">
                                  {item.date} • {item.authorEmail}
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openGalEdit(item)}
                                    className="bg-slate-100 hover:bg-emerald-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                                  >
                                    Sửa
                                  </button>
                                )}
                                {canDel && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await deleteEditorialGalleryItem(item);
                                        await loadWorkspace();
                                        await onContentMutated();
                                        setBanner({ type: 'success', text: `Đã xóa "${item.title}".` });
                                      } catch (err: any) {
                                        setBanner({ type: 'error', text: err?.message || 'Không thể xóa mục này.' });
                                      }
                                    }}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================== 4. DOCUMENTS (DIRECT PUBLISH) ==================== */}
                {activeSection === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Kho Tài Liệu — Đăng Trực Tiếp ({bundle.documentItems.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Hỗ trợ PDF, Word, Excel, PowerPoint, Google Drive, OneDrive (bắt buộc đường dẫn <code className="bg-slate-100 px-1 rounded">https://</code>). Xuất bản trực tiếp không cần chờ duyệt.
                        </p>
                      </div>
                      {canCreateDoc && (
                        <button
                          type="button"
                          onClick={openDocCreate}
                          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Đăng Tài Liệu Mới</span>
                        </button>
                      )}
                    </div>

                    {showDocForm && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-emerald-950">
                            {editingDoc ? 'Chỉnh Sửa Tài Liệu' : 'Đăng Tài Liệu Trực Tiếp Vào Kho Học Liệu'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowDocForm(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tên tài liệu / Học liệu *
                            </label>
                            <input
                              type="text"
                              value={docTitle}
                              onChange={(e) => setDocTitle(e.target.value)}
                              placeholder="Ví dụ: Bộ đề ôn tập Tiếng Việt lớp 5..."
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Đường dẫn tải / xem tài liệu (https://...) *
                            </label>
                            <input
                              type="url"
                              value={docUrl}
                              onChange={(e) => setDocUrl(e.target.value)}
                              placeholder="https://drive.google.com/file/d/.../view"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên mục</label>
                            <select
                              value={docCategory}
                              onChange={(e) =>
                                setDocCategory(e.target.value as FirestoreDocumentRecord['category'])
                              }
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            >
                              {DOC_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Định dạng tệp</label>
                            <select
                              value={docFileType}
                              onChange={(e) => setDocFileType(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            >
                              {ALLOWED_DOCUMENT_FILE_TYPES.map((ft) => (
                                <option key={ft} value={ft}>{ft}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Dung lượng</label>
                            <input
                              type="text"
                              value={docFileSize}
                              onChange={(e) => setDocFileSize(e.target.value)}
                              placeholder="VD: 2.5 MB"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả nội dung *</label>
                            <textarea
                              rows={3}
                              value={docDesc}
                              onChange={(e) => setDocDesc(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-emerald-200">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitDocument('draft')}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Lưu Bản Nháp</span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void submitDocument('published')}
                            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{saving ? 'Đang lưu...' : 'Xuất Bản Trực Tiếp'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {bundle.documentItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                          Chưa có tài liệu nào được đăng trực tiếp qua phân quyền.
                        </div>
                      ) : (
                        bundle.documentItems.map((item) => {
                          const canEdit = canEditItem(roleRecord, 'documents', item.authorUid);
                          const canDel = canDeleteItem(roleRecord, 'documents', item.authorUid);
                          return (
                            <div
                              key={item.id}
                              className="border border-slate-200 rounded-2xl p-3.5 bg-white flex flex-col sm:flex-row gap-3 justify-between"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                                    {item.categoryLabel}
                                  </span>
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                    {item.fileType}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      item.status === 'published'
                                        ? 'bg-sky-50 text-sky-800'
                                        : 'bg-amber-100 text-amber-950'
                                    }`}
                                  >
                                    {item.status === 'published' ? 'Công khai' : 'Bản nháp'}
                                  </span>
                                </div>
                                <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                                <a
                                  href={item.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 hover:underline break-all"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span>{item.downloadUrl}</span>
                                </a>
                                <div className="text-[11px] text-slate-500">
                                  {item.uploadDate} • Đăng bởi: <strong>{item.authorEmail}</strong>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openDocEdit(item)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-emerald-100 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                )}
                                {canDel && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await deleteEditorialDocumentItem(item);
                                        await loadWorkspace();
                                        await onContentMutated();
                                        setBanner({ type: 'success', text: `Đã xóa tài liệu "${item.title}".` });
                                      } catch (err: any) {
                                        setBanner({ type: 'error', text: err?.message || 'Không thể xóa tài liệu.' });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== 5. PUBLIC SECTIONS (home, about, staff, admissions, contact, other) ==================== */}
                {['home', 'about', 'staff', 'admissions', 'contact', 'other'].includes(activeSection) && (() => {
                  const secId = activeSection as EditablePublicSectionId;
                  const def = MAIN_SECTION_SCOPES.find((s) => s.key === secId);
                  const canSaveSec = currentSectionDoc
                    ? canEditItem(roleRecord, secId, currentSectionDoc.authorUid)
                    : canPerformScopeAction(roleRecord, secId, 'CREATE');
                  const canDelSec = currentSectionDoc
                    ? canDeleteItem(roleRecord, secId, currentSectionDoc.authorUid)
                    : false;

                  const labelsMap: Record<EditablePublicSectionId, [string, string, string, string]> = {
                    home: [
                      'Khẩu hiệu nhà trường (Slogan)',
                      'Mô tả giới thiệu ngắn trên Banner Trang chủ',
                      'Tiêu đề Lịch làm việc nhà trường',
                      'Mô tả Lịch làm việc nhà trường',
                    ],
                    about: [
                      'Tiêu đề mục Lịch sử hình thành',
                      'Nội dung Lịch sử & Truyền thống nhà trường',
                      'Sứ mệnh giáo dục',
                      'Tầm nhìn phát triển',
                    ],
                    staff: [
                      'Thông điệp lãnh đạo / Giới thiệu đội ngũ',
                      'Thông báo công khai mục Đội ngũ giáo viên',
                      'Phụ trách Trường chính',
                      '',
                    ],
                    admissions: [
                      'Tiêu đề Tuyển sinh',
                      'Mô tả thông báo Tuyển sinh công khai',
                      'Hotline tư vấn Tuyển sinh',
                      'Ghi chú hồ sơ / Tuyển sinh',
                    ],
                    contact: [
                      'Số điện thoại Hotline nhà trường',
                      'Email liên hệ chính thức',
                      'Địa chỉ công khai nhà trường',
                      'Thời gian tiếp phụ huynh & nhân dân',
                    ],
                    other: [
                      'Tiêu đề khối giới thiệu Kho tài liệu trên Trang chủ',
                      'Mô tả khối giới thiệu Kho tài liệu',
                      'Thông báo công khai bổ sung (tùy chọn)',
                      '',
                    ],
                  };

                  const [l1, l2, l3, l4] = labelsMap[secId];

                  return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <h3 className="text-base font-black text-slate-900">
                            Biên Tập Mục: {def?.label || secId}
                          </h3>
                          <p className="text-xs text-slate-500">{def?.description}</p>
                        </div>
                        {currentSectionDoc && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <Globe className="w-3.5 h-3.5" />
                            <span>
                              {currentSectionDoc.status === 'published' ? 'Đang xuất bản trực tiếp' : 'Bản nháp'} • {currentSectionDoc.authorEmail}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">{l1}</label>
                          <input
                            type="text"
                            value={secField1}
                            onChange={(e) => setSecField1(e.target.value)}
                            disabled={!canSaveSec}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">{l2}</label>
                          <textarea
                            rows={4}
                            value={secField2}
                            onChange={(e) => setSecField2(e.target.value)}
                            disabled={!canSaveSec}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-slate-100"
                          />
                        </div>

                        {l3 && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">{l3}</label>
                            <textarea
                              rows={2}
                              value={secField3}
                              onChange={(e) => setSecField3(e.target.value)}
                              disabled={!canSaveSec}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-slate-100"
                            />
                          </div>
                        )}

                        {l4 && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">{l4}</label>
                            <textarea
                              rows={3}
                              value={secField4}
                              onChange={(e) => setSecField4(e.target.value)}
                              disabled={!canSaveSec}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-slate-100"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                          <div>
                            {canDelSec && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    await deleteEditorialSectionContent(secId);
                                    await loadWorkspace();
                                    await onContentMutated();
                                    setBanner({
                                      type: 'success',
                                      text: `Đã xóa bản ghi biên tập riêng của mục "${def?.label}" (hiển thị lại nội dung gốc).`,
                                    });
                                  } catch (err: any) {
                                    setBanner({ type: 'error', text: err?.message || 'Không thể xóa bản ghi mục này.' });
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa bản cập nhật riêng</span>
                              </button>
                            )}
                          </div>

                          {canSaveSec ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void submitSectionContent('draft')}
                                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Lưu Bản Nháp</span>
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void submitSectionContent('published')}
                                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{saving ? 'Đang lưu...' : 'Xuất Bản Trực Tiếp'}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-800 font-semibold">
                              Bạn không có quyền chỉnh sửa bản ghi hiện tại của mục này.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
