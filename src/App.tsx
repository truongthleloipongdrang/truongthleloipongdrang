import { onlineEnabled, loadOnlineContent, logoutOnline, saveOnlineContent, isFirebaseConfigured, isOnlineAuthenticated } from './onlineStore';
import { isTrustedPreviewEnvironment, MOCK_PREVIEW_STUDENTS, MOCK_PREVIEW_ADMISSIONS, MOCK_PREVIEW_FEEDBACK } from './authEnvironment';
import { INITIAL_SITE_CONTENT } from './data';
import React, { useState, useEffect } from 'react';
import {
  NavSection,
  SiteContent,
  EditableCardPayload,
  MemberUser,
  NewsItem,
  DocumentItem,
} from './types';
import {
  loadSiteContent,
  saveSiteContentLocal,
  resetSiteContentToDefault,
  fetchRemoteSiteContent,
  confirmRemotePublished,
} from './siteContentSync';
import { updatePageSeo } from './seo';

// Components
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { HomeSection } from './components/HomeSection';
import { AboutSection } from './components/AboutSection';
import { StaffSection } from './components/StaffSection';
import { NewsSection } from './components/NewsSection';
import { ActivitiesSection } from './components/ActivitiesSection';
import { AdmissionsSection } from './components/AdmissionsSection';
import { StudentLookupSection } from './components/StudentLookupSection';
import { DocumentsSection } from './components/DocumentsSection';
import { GallerySection } from './components/GallerySection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

// Modals
import { EditCardModal } from './components/EditCardModal';
import { AdminModal } from './components/AdminModal';
import { MemberLoginModal } from './components/MemberLoginModal';
import { AdmissionsSummaryModal } from './components/AdmissionsSummaryModal';
import { ShieldCheck, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  getStoredRegistrations,
  ADMISSIONS_UPDATE_EVENT,
  initAdmissionsSync,
} from './admissionsStorage';
import {
  getStoredFeedback,
  FEEDBACK_UPDATE_EVENT,
  NEW_FEEDBACK_NOTIFICATION_EVENT,
  initFeedbackSync,
} from './feedbackStorage';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('home');
  const [content, setContent] = useState<SiteContent>(() => {
    // Preview always starts from a clean mock baseline, not browser drafts.
    if (isTrustedPreviewEnvironment()) {
      return { ...INITIAL_SITE_CONTENT, students: [...MOCK_PREVIEW_STUDENTS] };
    }
    const initial = loadSiteContent();
    return onlineEnabled ? { ...initial, students: [] } : initial;
  });
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Authentication states
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<
    | 'school'
    | 'staff'
    | 'news'
    | 'students'
    | 'documents'
    | 'members'
    | 'admissions_registrations'
    | 'feedback'
    | 'password'
    | 'sync'
  >('school');

  // Admissions new registrations notification counter & summary modal
  const [isAdmissionsSummaryOpen, setIsAdmissionsSummaryOpen] = useState<boolean>(false);
  const [pendingRegistrationsCount, setPendingRegistrationsCount] = useState<number>(() => {
    if (isTrustedPreviewEnvironment()) {
      return MOCK_PREVIEW_ADMISSIONS.filter((r) => r.status === 'pending').length;
    }
    return getStoredRegistrations().filter((r) => r.status === 'pending').length;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setPendingRegistrationsCount(
        getStoredRegistrations().filter((r) => r.status === 'pending').length
      );
    };
    window.addEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
  }, []);

  // Feedback submissions notification counter & state
  const [feedbackList, setFeedbackList] = useState(() => {
    if (isTrustedPreviewEnvironment()) {
      return MOCK_PREVIEW_FEEDBACK;
    }
    return getStoredFeedback();
  });
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length;

  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbackList(getStoredFeedback());
    };
    window.addEventListener(FEEDBACK_UPDATE_EVENT, handleFeedbackUpdate);
    window.addEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFeedbackUpdate);
    return () => {
      window.removeEventListener(FEEDBACK_UPDATE_EVENT, handleFeedbackUpdate);
      window.removeEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFeedbackUpdate);
    };
  }, []);

  // Member states
  const [currentMember, setCurrentMember] = useState<MemberUser | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [memberLogList, setMemberLogList] = useState<MemberUser[]>([]);

  // Universal Card Editor state
  const [editCardData, setEditCardData] = useState<EditableCardPayload | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Hidden admin button toggle state (Ctrl + K)
  const [showAdminButton, setShowAdminButton] = useState<boolean>(false);

  // Hàm đăng xuất thống nhất cho Quản trị viên
  const handleAdminLogout = () => {
    logoutOnline();
    if (isPreviewMode) {
      setContent({ ...INITIAL_SITE_CONTENT, students: [...MOCK_PREVIEW_STUDENTS] });
    }
    setIsAdmin(false);
    setIsPreviewMode(false);
    setShowAdminButton(false);
    setIsAdminModalOpen(false);
    setEditCardData(null);
    setIsEditModalOpen(false);
    setAdminNotice('Đã đăng xuất an toàn khỏi chế độ quản trị.');
    setTimeout(() => setAdminNotice(null), 3000);
  };

  // Initialize admissions & feedback real-time sync with server & multi-tab
  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Môi trường xem trước AI Studio hoàn toàn không gọi sync hay polling với Firestore production
  useEffect(() => {
    if (isTrustedPreviewEnvironment()) {
      return;
    }
    initAdmissionsSync();
    initFeedbackSync();
  }, []);

  // SEO update on navigation
  useEffect(() => {
    updatePageSeo(currentSection);
  }, [currentSection]);

  // Public visitors always read the live Firestore document when configured.
  // Local drafts can never override published data for anonymous users.
  // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối không đọc Firestore production trong môi trường xem trước AI Studio
  useEffect(() => {
    if (isTrustedPreviewEnvironment()) {
      return;
    }
    let active = true;
    (isFirebaseConfigured() ? loadOnlineContent() : fetchRemoteSiteContent()).then((remoteData) => {
      if (!active || !remoteData || !remoteData.schoolInfo) return;
      if (!isFirebaseConfigured() && !confirmRemotePublished(remoteData as SiteContent)) {
        // Local admin edits have not yet reached the deployed public JSON.
        return;
      }
      const remoteSchoolInfo = remoteData.schoolInfo;
      setContent((prev) => ({
        ...prev,
        ...remoteData,
        students: onlineEnabled ? [] : prev.students,
        schoolInfo: {
          ...prev.schoolInfo,
          ...remoteSchoolInfo,
          stats: {
            ...prev.schoolInfo.stats,
            ...(remoteSchoolInfo.stats || {}),
          },
        },
      }));
    }).catch((error) => console.error('Không tải được dữ liệu trực tuyến:', error));
    return () => { active = false; };
  }, []);

  // Keyboard shortcut Ctrl+K or Cmd+K to toggle admin button visibility and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAdminButton((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync route from URL hash if user refreshes or follows deep links
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace('#', '');
      const validSections: Record<string, NavSection> = {
        'trang-chu': 'home',
        'gioi-thieu': 'about',
        'ban-giam-hieu': 'staff',
        'doi-ngu': 'staff',
        'tin-tuc': 'news',
        'hoat-dong': 'activities',
        'tuyen-sinh': 'admissions',
        'tra-cuu': 'student-lookup',
        'tai-lieu': 'documents',
        'thu-vien-anh': 'gallery',
        'lien-he': 'contact',
      };
      if (hash && validSections[hash]) {
        setCurrentSection(validSections[hash]);
      }
    };
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Update hash when section changes
  const handleNavigate = (section: NavSection) => {
    setCurrentSection(section);
    const hashMap: Record<NavSection, string> = {
      home: '',
      about: 'gioi-thieu',
      staff: 'ban-giam-hieu',
      news: 'tin-tuc',
      activities: 'hoat-dong',
      admissions: 'tuyen-sinh',
      'student-lookup': 'tra-cuu',
      documents: 'tai-lieu',
      gallery: 'thu-vien-anh',
      contact: 'lien-he',
    };
    if (hashMap[section]) {
      window.location.hash = hashMap[section];
    } else {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Open the card editor for ANY card
  const handleOpenEditCard = (payload: EditableCardPayload) => {
    setEditCardData(payload);
    setIsEditModalOpen(true);
  };

  // Save changes from Universal Card Editor
  const handleSaveCard = (updatedCard: EditableCardPayload) => {
    const nextContent = { ...content };

    switch (updatedCard.sectionKey) {
      case 'schoolInfo':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          name: updatedCard.title || nextContent.schoolInfo.name,
          slogan: updatedCard.subtitle || nextContent.schoolInfo.slogan,
          heroDescription: updatedCard.content || nextContent.schoolInfo.heroDescription,
          heroBadge: updatedCard.extraField1Value || nextContent.schoolInfo.heroBadge,
          fullAddress: updatedCard.extraField2Value || nextContent.schoolInfo.fullAddress,
          stats: {
            ...nextContent.schoolInfo.stats,
            standardLevel: updatedCard.extraField3Value || nextContent.schoolInfo.stats.standardLevel,
          },
          establishedYear: updatedCard.extraField4Value || nextContent.schoolInfo.establishedYear,
          phone: updatedCard.extraField5Value || nextContent.schoolInfo.phone,
          email: updatedCard.extraField6Value || nextContent.schoolInfo.email,
        };
        break;

      case 'schoolStats':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          statsAcademicYear: updatedCard.subtitle || nextContent.schoolInfo.statsAcademicYear,
          leadershipText: updatedCard.content || nextContent.schoolInfo.leadershipText,
          stats: {
            ...nextContent.schoolInfo.stats,
            studentsCount: updatedCard.extraField1Value
              ? parseInt(updatedCard.extraField1Value.replace(/\D/g, ''), 10) || nextContent.schoolInfo.stats.studentsCount
              : nextContent.schoolInfo.stats.studentsCount,
            teachersCount: updatedCard.extraField2Value
              ? parseInt(updatedCard.extraField2Value.replace(/\D/g, ''), 10) || nextContent.schoolInfo.stats.teachersCount
              : nextContent.schoolInfo.stats.teachersCount,
            classesCount: updatedCard.extraField3Value
              ? parseInt(updatedCard.extraField3Value.replace(/\D/g, ''), 10) || nextContent.schoolInfo.stats.classesCount
              : nextContent.schoolInfo.stats.classesCount,
            branchesCount: updatedCard.extraField4Value
              ? parseInt(updatedCard.extraField4Value.replace(/\D/g, ''), 10) || nextContent.schoolInfo.stats.branchesCount
              : nextContent.schoolInfo.stats.branchesCount,
          },
        };
        break;

      case 'mainCampus':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          mainCampusName: updatedCard.title || nextContent.schoolInfo.mainCampusName,
          mainCampusTag: updatedCard.subtitle || nextContent.schoolInfo.mainCampusTag,
          fullAddress: updatedCard.content || nextContent.schoolInfo.fullAddress,
          mainCampusLeader: updatedCard.extraField1Value || nextContent.schoolInfo.mainCampusLeader,
          phone: updatedCard.extraField2Value || nextContent.schoolInfo.phone,
          email: updatedCard.extraField3Value || nextContent.schoolInfo.email,
        };
        break;

      case 'branch1':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          branch1Name: updatedCard.title || nextContent.schoolInfo.branch1Name,
          branch1Tag: updatedCard.subtitle || nextContent.schoolInfo.branch1Tag,
          branch1Address: updatedCard.content || nextContent.schoolInfo.branch1Address,
          branch1Leader: updatedCard.extraField1Value || nextContent.schoolInfo.branch1Leader,
          branch1Phone: updatedCard.extraField2Value || nextContent.schoolInfo.branch1Phone,
          branch1Note: updatedCard.extraField3Value || nextContent.schoolInfo.branch1Note,
        };
        break;

      case 'branch2':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          branch2Name: updatedCard.title || nextContent.schoolInfo.branch2Name,
          branch2Tag: updatedCard.subtitle || nextContent.schoolInfo.branch2Tag,
          branch2Address: updatedCard.content || nextContent.schoolInfo.branch2Address,
          branch2Leader: updatedCard.extraField1Value || nextContent.schoolInfo.branch2Leader,
          branch2Phone: updatedCard.extraField2Value || nextContent.schoolInfo.branch2Phone,
          branch2Note: updatedCard.extraField3Value || nextContent.schoolInfo.branch2Note,
        };
        break;

      case 'schoolSchedule':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          scheduleTitle: updatedCard.title || nextContent.schoolInfo.scheduleTitle,
          scheduleTag: updatedCard.subtitle || nextContent.schoolInfo.scheduleTag,
          scheduleDescription: updatedCard.content || nextContent.schoolInfo.scheduleDescription,
          scheduleMorningTime: updatedCard.extraField1Value || nextContent.schoolInfo.scheduleMorningTime,
          scheduleAfternoonTime: updatedCard.extraField2Value || nextContent.schoolInfo.scheduleAfternoonTime,
          scheduleReceptionTime: updatedCard.extraField3Value || nextContent.schoolInfo.scheduleReceptionTime,
        };
        break;

      case 'scheduleMorning':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          scheduleMorningTitle: updatedCard.title || nextContent.schoolInfo.scheduleMorningTitle,
          scheduleMorningTime: updatedCard.content || nextContent.schoolInfo.scheduleMorningTime,
        };
        break;

      case 'scheduleAfternoon':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          scheduleAfternoonTitle: updatedCard.title || nextContent.schoolInfo.scheduleAfternoonTitle,
          scheduleAfternoonTime: updatedCard.content || nextContent.schoolInfo.scheduleAfternoonTime,
        };
        break;

      case 'scheduleReception':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          scheduleReceptionTitle: updatedCard.title || nextContent.schoolInfo.scheduleReceptionTitle,
          scheduleReceptionTime: updatedCard.content || nextContent.schoolInfo.scheduleReceptionTime,
        };
        break;

      case 'principals':
        if (updatedCard.itemId) {
          nextContent.principals = nextContent.principals.map((p) =>
            p.id === updatedCard.itemId
              ? {
                  ...p,
                  name: updatedCard.title,
                  title: updatedCard.subtitle || p.title,
                  bio: updatedCard.content,
                  avatar: updatedCard.imageUrl || p.avatar,
                  roleScope: updatedCard.extraField1Value || p.roleScope,
                  campus: updatedCard.extraField2Value || p.campus,
                  phone: updatedCard.extraField3Value !== undefined ? updatedCard.extraField3Value : p.phone,
                  email: updatedCard.extraField4Value !== undefined ? updatedCard.extraField4Value : p.email,
                }
              : p
          );
        }
        break;

      case 'teachers':
        if (updatedCard.itemId) {
          nextContent.teachers = nextContent.teachers.map((t) =>
            t.id === updatedCard.itemId
              ? {
                  ...t,
                  name: updatedCard.title,
                  role: updatedCard.subtitle || t.role,
                  bio: updatedCard.content,
                  avatar: updatedCard.imageUrl || t.avatar,
                  subjectOrGrade: updatedCard.extraField1Value || t.subjectOrGrade,
                  campus: (updatedCard.extraField2Value as any) || t.campus,
                  achievements:
                    updatedCard.extraField3Value !== undefined
                      ? updatedCard.extraField3Value
                          .split(',')
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0)
                      : t.achievements,
                  qualification: updatedCard.extraField4Value || t.qualification,
                }
              : t
          );
        }
        break;

      case 'news':
        if (updatedCard.itemId) {
          nextContent.news = nextContent.news.map((n) =>
            n.id === updatedCard.itemId
              ? {
                  ...n,
                  title: updatedCard.title,
                  categoryLabel: updatedCard.subtitle || n.categoryLabel,
                  content: updatedCard.content,
                  summary: updatedCard.content.slice(0, 150) + '...',
                  imageUrl: updatedCard.imageUrl || n.imageUrl,
                  date: updatedCard.extraField1Value || n.date,
                  author: updatedCard.extraField2Value || n.author,
                }
              : n
          );
        }
        break;

      case 'activities':
        if (updatedCard.itemId) {
          nextContent.activities = nextContent.activities.map((a) =>
            a.id === updatedCard.itemId
              ? {
                  ...a,
                  title: updatedCard.title,
                  categoryLabel: updatedCard.subtitle || a.categoryLabel,
                  description: updatedCard.content,
                  imageUrl: updatedCard.imageUrl || a.imageUrl,
                  date: updatedCard.extraField1Value || a.date,
                }
              : a
          );
        }
        break;

      case 'admissionsHeader':
        nextContent.admissions = {
          ...nextContent.admissions,
          headerTitle: updatedCard.title || nextContent.admissions.headerTitle,
          headerTag: updatedCard.subtitle || nextContent.admissions.headerTag,
          headerDescription: updatedCard.content || nextContent.admissions.headerDescription,
          academicYear: updatedCard.extraField1Value || nextContent.admissions.academicYear,
        };
        break;

      case 'admissionsHomeTeaser':
        {
          const oldYear = nextContent.admissions.academicYear;
          const oldTarget = nextContent.admissions.targetCount;

          const newYear = updatedCard.extraField1Value?.trim() || oldYear;
          const parsedCount = updatedCard.extraField2Value
            ? parseInt(updatedCard.extraField2Value.replace(/\D/g, ''), 10) || oldTarget
            : oldTarget;

          let newTag = updatedCard.subtitle?.trim() || nextContent.admissions.homeTeaserTag || `TUYỂN SINH NĂM HỌC ${newYear}`;
          if (newYear !== oldYear && newTag.includes(oldYear)) {
            newTag = newTag.replace(oldYear, newYear);
          }

          let newDesc = updatedCard.content?.trim() || nextContent.admissions.homeTeaserDescription || `Chỉ tiêu ${parsedCount} học sinh tại Trường chính và 2 Phân hiệu. Xem hướng dẫn thủ tục, hồ sơ và thời gian tiếp nhận.`;
          if (parsedCount !== oldTarget && newDesc.includes(`${oldTarget} học sinh`)) {
            newDesc = newDesc.replace(`${oldTarget} học sinh`, `${parsedCount} học sinh`);
          }

          nextContent.admissions = {
            ...nextContent.admissions,
            academicYear: newYear,
            targetCount: parsedCount,
            homeTeaserTitle: updatedCard.title || nextContent.admissions.homeTeaserTitle,
            homeTeaserTag: newTag,
            homeTeaserDescription: newDesc,
            homeTeaserButtonText: updatedCard.extraField3Value || nextContent.admissions.homeTeaserButtonText,
          };
        }
        break;

      case 'documentsHomeTeaser':
        nextContent.schoolInfo = {
          ...nextContent.schoolInfo,
          docsTeaserTitle: updatedCard.title || nextContent.schoolInfo.docsTeaserTitle,
          docsTeaserTag: updatedCard.subtitle || nextContent.schoolInfo.docsTeaserTag,
          docsTeaserDescription: updatedCard.content || nextContent.schoolInfo.docsTeaserDescription,
          docsTeaserButtonText: updatedCard.extraField1Value || nextContent.schoolInfo.docsTeaserButtonText,
        };
        break;

      case 'admissions':
      case 'admissionsBanner':
        nextContent.admissions = {
          ...nextContent.admissions,
          bannerTitle: updatedCard.title || nextContent.admissions.bannerTitle,
          bannerTag: updatedCard.subtitle || nextContent.admissions.bannerTag,
          bannerDescription: updatedCard.content || nextContent.admissions.bannerDescription,
          targetCount: updatedCard.extraField1Value
            ? parseInt(updatedCard.extraField1Value.replace(/\D/g, ''), 10) || nextContent.admissions.targetCount
            : nextContent.admissions.targetCount,
          hotline: updatedCard.extraField2Value || nextContent.admissions.hotline,
          academicYear: updatedCard.extraField3Value || nextContent.admissions.academicYear,
          notes: updatedCard.extraField4Value || nextContent.admissions.notes,
        };
        break;

      case 'admissionsEligibility':
        nextContent.admissions = {
          ...nextContent.admissions,
          eligibilityTitle: updatedCard.title || nextContent.admissions.eligibilityTitle,
          eligibility: updatedCard.content
            .split('\n')
            .map((s) => s.trim().replace(/^[✓•\-\*]\s*/, ''))
            .filter((s) => s.length > 0),
        };
        break;

      case 'admissionsRequiredDocs':
        nextContent.admissions = {
          ...nextContent.admissions,
          requiredDocsTitle: updatedCard.title || nextContent.admissions.requiredDocsTitle,
          requiredDocs: updatedCard.content
            .split('\n')
            .map((s) => s.trim().replace(/^(\d+[\.\)]|[•\-\*])\s*/, ''))
            .filter((s) => s.length > 0),
        };
        break;

      case 'admissionsScheduleHeader':
        nextContent.admissions = {
          ...nextContent.admissions,
          scheduleTitle: updatedCard.title || nextContent.admissions.scheduleTitle,
          scheduleTag: updatedCard.subtitle || nextContent.admissions.scheduleTag,
        };
        break;

      case 'admissionsScheduleStep':
        if (updatedCard.itemId) {
          const stepNum = parseInt(updatedCard.itemId, 10);
          nextContent.admissions = {
            ...nextContent.admissions,
            schedule: nextContent.admissions.schedule.map((step) =>
              step.step === stepNum
                ? {
                    ...step,
                    title: updatedCard.title,
                    time: updatedCard.extraField1Value || updatedCard.subtitle || step.time,
                    description: updatedCard.content,
                  }
                : step
            ),
          };
        }
        break;

      case 'admissionsConsultation':
        nextContent.admissions = {
          ...nextContent.admissions,
          consultationTitle: updatedCard.title || nextContent.admissions.consultationTitle,
          consultationTag: updatedCard.subtitle || nextContent.admissions.consultationTag,
          consultationDescription: updatedCard.content || nextContent.admissions.consultationDescription,
        };
        break;

      case 'students':
        if (updatedCard.itemId) {
          nextContent.students = nextContent.students.map((s) =>
            s.id === updatedCard.itemId
              ? {
                  ...s,
                  fullName: updatedCard.title,
                  teacherName: updatedCard.extraField1Value || s.teacherName,
                  awards: updatedCard.extraField2Value || s.awards,
                  campus: updatedCard.extraField3Value || s.campus,
                }
              : s
          );
        }
        break;

      case 'documents':
        if (updatedCard.itemId) {
          nextContent.documents = nextContent.documents.map((d) =>
            d.id === updatedCard.itemId
              ? {
                  ...d,
                  title: updatedCard.title,
                  categoryLabel: updatedCard.subtitle || d.categoryLabel,
                  description: updatedCard.content,
                  downloadUrl: updatedCard.extraField1Value !== undefined ? updatedCard.extraField1Value : d.downloadUrl,
                  fileSize: updatedCard.extraField2Value || d.fileSize,
                  fileType: updatedCard.extraField3Value || d.fileType,
                }
              : d
          );
        }
        break;

      case 'gallery':
        if (updatedCard.itemId) {
          nextContent.gallery = nextContent.gallery.map((g) =>
            g.id === updatedCard.itemId
              ? {
                  ...g,
                  title: updatedCard.title,
                  caption: updatedCard.content,
                  imageUrl: updatedCard.imageUrl || g.imageUrl,
                  date: updatedCard.extraField1Value || g.date,
                }
              : g
          );
        }
        break;

      case 'history':
        nextContent.historyTitle = updatedCard.title || nextContent.historyTitle;
        nextContent.historyTag = updatedCard.subtitle || nextContent.historyTag;
        nextContent.history = updatedCard.content;
        if (updatedCard.imageUrl) nextContent.historyImageUrl = updatedCard.imageUrl;
        if (updatedCard.imageCaption) nextContent.historyImageCaption = updatedCard.imageCaption;
        if (updatedCard.extraField1Value) nextContent.historyStat1Value = updatedCard.extraField1Value;
        if (updatedCard.extraField2Value) nextContent.historyStat1Label = updatedCard.extraField2Value;
        if (updatedCard.extraField3Value) nextContent.historyStat2Value = updatedCard.extraField3Value;
        if (updatedCard.extraField4Value) nextContent.historyStat2Label = updatedCard.extraField4Value;
        if (updatedCard.extraField5Value) nextContent.historyStat3Value = updatedCard.extraField5Value;
        if (updatedCard.extraField6Value) nextContent.historyStat3Label = updatedCard.extraField6Value;
        break;

      case 'mission':
        nextContent.missionTitle = updatedCard.title || nextContent.missionTitle;
        nextContent.mission = updatedCard.content;
        if (updatedCard.extraField1Value) nextContent.missionFooter = updatedCard.extraField1Value;
        break;

      case 'vision':
        nextContent.visionTitle = updatedCard.title || nextContent.visionTitle;
        nextContent.vision = updatedCard.content;
        if (updatedCard.extraField1Value) nextContent.visionFooter = updatedCard.extraField1Value;
        break;

      case 'coreValues':
        if (updatedCard.itemId !== undefined) {
          const index = parseInt(updatedCard.itemId, 10);
          if (!isNaN(index) && nextContent.coreValues[index]) {
            nextContent.coreValues = nextContent.coreValues.map((cv, i) =>
              i === index
                ? {
                    ...cv,
                    title: updatedCard.title,
                    desc: updatedCard.content,
                  }
                : cv
            );
          }
        }
        break;

      case 'facilities':
        if (updatedCard.itemId !== undefined) {
          const index = parseInt(updatedCard.itemId, 10);
          if (!isNaN(index) && nextContent.facilities[index]) {
            nextContent.facilities = nextContent.facilities.map((fac, i) =>
              i === index
                ? {
                    ...fac,
                    title: updatedCard.title,
                    campus: updatedCard.extraField1Value || fac.campus,
                    desc: updatedCard.content,
                    image: updatedCard.imageUrl || fac.image,
                  }
                : fac
            );
          }
        }
        break;

      default:
        break;
    }

    setContent(nextContent);
    if (isPreviewMode) {
      // Chế độ preview AI Studio: CHỈ thay đổi React state trong bộ nhớ, KHÔNG ghi localStorage hoặc Firestore production
      setAdminNotice(`[Xem trước AI Studio]: Đã cập nhật thẻ "${updatedCard.title}" trong bộ nhớ tạm (không ghi localStorage / Firestore).`);
    } else if (onlineEnabled && isOnlineAuthenticated()) {
      setAdminNotice('Đang lưu nội dung lên Firebase...');
      void saveOnlineContent(nextContent)
        .then(() => setAdminNotice('Đã lưu nội dung công khai lên Firebase.'))
        .catch((e) => setAdminNotice(`CHƯA lưu lên Firebase: ${e.message}`));
    } else {
      saveSiteContentLocal(nextContent);
      setAdminNotice(`Đã cập nhật thẻ: "${updatedCard.title}" trên trình duyệt.`);
    }
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Document download counter
  const handleIncrementDownload = (docId: string) => {
    const updatedDocs = content.documents.map((d) =>
      d.id === docId ? { ...d, downloadCount: d.downloadCount + 1 } : d
    );
    const next = { ...content, documents: updatedDocs };
    setContent(next);
    if (!isPreviewMode) {
      saveSiteContentLocal(next);
    }
  };

  // Member uploads a new document
  const handleMemberUploadDoc = (newDoc: DocumentItem) => {
    const next = { ...content, documents: [newDoc, ...content.documents] };
    setContent(next);
    if (!isPreviewMode) {
      saveSiteContentLocal(next);
    }
  };

  // Member login success
  const handleMemberLoginSuccess = (member: MemberUser) => {
    setCurrentMember(member);
    setMemberLogList((prev) => [member, ...prev.filter((m) => m.email !== member.email)]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdf4] font-sans antialiased text-slate-800">
      {/* Admin Floating Banner Bar when logged in */}
      {isAdmin && (
        <aside
          aria-label="Thanh quản trị đang hoạt động"
          className={`sticky top-0 z-50 text-slate-950 px-4 py-2 text-xs font-bold shadow-md flex items-center justify-between ${
            isPreviewMode
              ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 border-b border-amber-500'
              : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>
              {isPreviewMode ? (
                <>
                  <span className="bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-black mr-1">
                    Xem trước AI Studio
                  </span>
                  Bạn đang ở chế độ xem trước nội bộ với dữ liệu mẫu. Không kết nối Cloud Firestore Production. Bấm <strong>✏️ Sửa thẻ này</strong> để thử nghiệm giao diện.
                </>
              ) : (
                <>
                  <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-black mr-1">
                    Firebase Admin
                  </span>
                  CHẾ ĐỘ QUẢN TRỊ FIREBASE ĐANG BẬT: Bạn có thể sửa trực tiếp bất kỳ thẻ nào trên trang bằng nút <strong>✏️ Sửa thẻ này</strong>.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {pendingRegistrationsCount > 0 && (
              <button
                onClick={() => {
                  setAdminInitialTab('admissions_registrations');
                  setIsAdminModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-black animate-pulse flex items-center space-x-1 cursor-pointer shadow-sm"
                title="Bấm để xem danh sách phụ huynh đăng ký tuyển sinh mới"
              >
                <span>🔔 Có {pendingRegistrationsCount} đăng ký mới!</span>
              </button>
            )}
            {pendingFeedbackCount > 0 && (
              <button
                onClick={() => {
                  setAdminInitialTab('feedback');
                  setIsAdminModalOpen(true);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-black animate-pulse flex items-center space-x-1 cursor-pointer shadow-sm"
                title="Bấm để xem các ý kiến đóng góp & trao đổi mới từ phụ huynh"
              >
                <span>💬 Có {pendingFeedbackCount} ý kiến trao đổi mới!</span>
              </button>
            )}
            <button
              onClick={() => {
                setAdminInitialTab('school');
                setIsAdminModalOpen(true);
              }}
              className="bg-slate-950 text-white hover:bg-slate-800 px-3 py-1 rounded-lg text-xs cursor-pointer"
            >
              Bảng Điều Khiển
            </button>
            <button
              onClick={handleAdminLogout}
              className="bg-amber-700/30 hover:bg-amber-700/50 text-slate-950 px-2 py-1 rounded-lg text-xs cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </aside>
      )}

      {/* Admin quick feedback notification */}
      {adminNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-bottom duration-300 border border-emerald-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{adminNotice}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentSection={currentSection}
        onNavigate={handleNavigate}
        schoolInfo={content.schoolInfo}
        isAdmin={isAdmin}
        showAdminButton={showAdminButton}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAdminAdmissions={() => {
          setAdminInitialTab('admissions_registrations');
          setIsAdminModalOpen(true);
        }}
        onOpenAdminFeedback={() => {
          setAdminInitialTab('feedback');
          setIsAdminModalOpen(true);
        }}
        onAdminLogout={handleAdminLogout}
        currentMember={currentMember}
        onOpenMemberLogin={() => setIsMemberModalOpen(true)}
        onMemberLogout={() => setCurrentMember(null)}
        onOpenAdmissionsSummary={() => setIsAdmissionsSummaryOpen(true)}
      />

      {/* Hero Banner (Always on Home) */}
      {currentSection === 'home' && (
        <HeroBanner
          schoolInfo={content.schoolInfo}
          isAdmin={isAdmin}
          onEditCard={handleOpenEditCard}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Section Content */}
      <main className="flex-1">
        {currentSection === 'home' && (
          <HomeSection
            content={content}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
            onNavigate={handleNavigate}
            onSelectNews={(news) => {
              setSelectedNews(news);
              setCurrentSection('news');
            }}
          />
        )}

        {currentSection === 'about' && (
          <AboutSection
            content={content}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}

        {currentSection === 'staff' && (
          <StaffSection
            content={content}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}

        {currentSection === 'news' && (
          <NewsSection
            newsList={content.news}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
            selectedNews={selectedNews}
            onSelectNews={setSelectedNews}
          />
        )}

        {currentSection === 'activities' && (
          <ActivitiesSection
            activities={content.activities}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}

        {currentSection === 'admissions' && (
          <AdmissionsSection
            admissions={content.admissions}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}

        {currentSection === 'student-lookup' && (
          <StudentLookupSection
            students={content.students}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
            onUpdateStudents={(newStudents) => {
              const next = { ...content, students: newStudents };
              setContent(next);
              if (!isPreviewMode) {
                saveSiteContentLocal(next);
              }
              setAdminNotice(
                isPreviewMode
                  ? '[Xem trước AI Studio]: Đã cập nhật danh sách học sinh trong bộ nhớ tạm.'
                  : 'Danh sách mới chỉ được sửa trên màn hình. Hãy vào quản trị và lưu riêng dữ liệu học sinh để cập nhật Firebase.'
              );
              setTimeout(() => setAdminNotice(null), 3500);
            }}
          />
        )}

        {currentSection === 'documents' && (
          <DocumentsSection
            documents={content.documents}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
            currentMember={currentMember}
            onOpenMemberLogin={() => setIsMemberModalOpen(true)}
            onUploadDocument={handleMemberUploadDoc}
            onIncrementDownload={handleIncrementDownload}
          />
        )}

        {currentSection === 'gallery' && (
          <GallerySection
            gallery={content.gallery}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}

        {currentSection === 'contact' && (
          <ContactSection
            schoolInfo={content.schoolInfo}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        schoolInfo={content.schoolInfo}
        onNavigate={handleNavigate}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isAdmin={isAdmin}
        showAdminShield={showAdminButton}
      />

      {/* Universal Card Editor Modal */}
      <EditCardModal
        isOpen={isEditModalOpen}
        cardData={editCardData}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveCard}
      />

      {/* Admin Dashboard & Login Modal (Triggered by Ctrl+K) */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLoginSuccess={(isPreview = false) => {
          setIsAdmin(true);
          setIsPreviewMode(isPreview);
        }}
        onLogout={handleAdminLogout}
        content={content}
        onSaveContent={(newContent, published = false) => {
          if (!isPreviewMode && !onlineEnabled) saveSiteContentLocal(newContent, !published);
          setContent(newContent);
        }}
        onResetContent={() => {
          // A preview reset must never touch persisted production/local drafts.
          const def = isPreviewMode
            ? { ...INITIAL_SITE_CONTENT, students: [...MOCK_PREVIEW_STUDENTS] }
            : resetSiteContentToDefault();
          setContent(def);
        }}
        memberLogList={memberLogList}
        initialTab={adminInitialTab}
      />

      {/* Member Login Modal */}
      <MemberLoginModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onLoginSuccess={handleMemberLoginSuccess}
      />

      {/* Admissions Consolidated Summary Modal */}
      <AdmissionsSummaryModal
        isOpen={isAdmissionsSummaryOpen}
        onClose={() => setIsAdmissionsSummaryOpen(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
