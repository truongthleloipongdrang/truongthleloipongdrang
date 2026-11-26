import {
  onlineEnabled,
  loadOnlineContent,
  logoutOnline,
  saveOnlineContent,
  isFirebaseConfigured,
  isOnlineAuthenticated,
  hasPermission,
  loadPrivateStudents,
  savePrivateStudents,
} from './onlineStore';
import {
  completeGoogleRedirectIfAny,
  subscribeToFirebaseAuth,
  isVerifiedGoogleFirebaseUser,
  getCurrentAuthenticatedGoogleMember,
  buildMemberFromFirebaseUser,
  buildParentFromFirebaseUser,
  fetchParentChildrenResults,
  signOutFirebaseUser,
} from './firebaseAuthStore';
import { isTrustedPreviewEnvironment, MOCK_PREVIEW_STUDENTS, MOCK_PREVIEW_ADMISSIONS, MOCK_PREVIEW_FEEDBACK } from './authEnvironment';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  NavSection,
  SiteContent,
  EditableCardPayload,
  MemberUser,
  ParentUser,
  NewsItem,
  StudentRecord,
  StudentResultRecord,
} from './types';
import { deduplicateStudents } from './studentExcelHelper';
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
    const initial = loadSiteContent();
    // Tách biệt tuyệt đối dữ liệu công khai và dữ liệu học sinh riêng tư:
    // Người chưa đăng nhập không bao giờ có sẵn danh sách học sinh trong trạng thái công khai.
    return { ...initial, students: [] };
  });
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Trạng thái dữ liệu học sinh riêng tư (chỉ nạp từ Firebase khi đã xác thực quyền quản trị)
  const [privateStudents, setPrivateStudents] = useState<StudentRecord[]>([]);
  const [privateStudentsLoading, setPrivateStudentsLoading] = useState<boolean>(false);
  const [privateStudentsLoaded, setPrivateStudentsLoaded] = useState<boolean>(false);
  const [privateStudentsError, setPrivateStudentsError] = useState<string | null>(null);
  const authSessionVersionRef = useRef<number>(0);

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

  // Member & Parent Firebase Auth states (độc lập hoàn toàn với phiên Quản trị)
  const [currentMember, setCurrentMember] = useState<MemberUser | null>(null);
  const [currentParent, setCurrentParent] = useState<ParentUser | null>(null);
  const [parentChildren, setParentChildren] = useState<StudentResultRecord[]>([]);
  const [parentChildrenLoading, setParentChildrenLoading] = useState<boolean>(false);
  const [parentChildrenError, setParentChildrenError] = useState<string | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [memberLogList, setMemberLogList] = useState<MemberUser[]>([]);
  const firebaseUserVersionRef = useRef<number>(0);

  // Tải kết quả học tập CHỈ của con em phụ huynh đã liên kết trong /parentLinks/{uid}
  const loadLinkedParentChildren = useCallback(async (uid: string) => {
    const reqVer = firebaseUserVersionRef.current;
    setParentChildrenLoading(true);
    setParentChildrenError(null);
    try {
      const { children } = await fetchParentChildrenResults(uid);
      if (reqVer !== firebaseUserVersionRef.current) return;
      setParentChildren(children);
      setParentChildrenError(null);
    } catch (err: any) {
      if (reqVer !== firebaseUserVersionRef.current) return;
      setParentChildren([]);
      setParentChildrenError(
        err?.message || 'Không thể tải kết quả học tập của con em từ Firebase.'
      );
    } finally {
      if (reqVer === firebaseUserVersionRef.current) {
        setParentChildrenLoading(false);
      }
    }
  }, []);

  // Tự động khôi phục phiên Thành viên Google / Phụ huynh qua Firebase Auth chính thức khi tải lại trang
  useEffect(() => {
    if (isTrustedPreviewEnvironment()) return;

    void completeGoogleRedirectIfAny()
      .then((redirectedMember) => {
        if (redirectedMember) {
          setCurrentMember(redirectedMember);
          setMemberLogList((prev) => [
            redirectedMember,
            ...prev.filter((m) => m.email !== redirectedMember.email),
          ]);
        }
      })
      .catch((err) => {
        console.warn('Hoàn tất chuyển hướng Google Auth chưa thành công:', err);
      });

    const unsubscribe = subscribeToFirebaseAuth((fbUser) => {
      firebaseUserVersionRef.current += 1;
      const version = firebaseUserVersionRef.current;

      if (!fbUser) {
        setCurrentMember(null);
        setCurrentParent(null);
        setParentChildren([]);
        setParentChildrenError(null);
        setParentChildrenLoading(false);
        return;
      }

      if (isVerifiedGoogleFirebaseUser(fbUser)) {
        const member = buildMemberFromFirebaseUser(fbUser);
        setCurrentMember(member);
        setMemberLogList((prev) => [
          member,
          ...prev.filter((m) => m.email !== member.email),
        ]);
        // Thành viên Google mặc định KHÔNG có quyền xem dữ liệu học sinh;
        // chỉ hiển thị kết quả con em nếu Quản trị viên đã chủ động liên kết UID này trong parentLinks/{uid}.
        setParentChildrenLoading(true);
        void fetchParentChildrenResults(fbUser.uid)
          .then(({ link, children }) => {
            if (version !== firebaseUserVersionRef.current) return;
            if (link && link.studentIds.length > 0) {
              setCurrentParent(buildParentFromFirebaseUser(fbUser, true));
              setParentChildren(children);
            } else {
              setCurrentParent(null);
              setParentChildren([]);
            }
            setParentChildrenError(null);
          })
          .catch(() => {
            if (version !== firebaseUserVersionRef.current) return;
            setCurrentParent(null);
            setParentChildren([]);
          })
          .finally(() => {
            if (version === firebaseUserVersionRef.current) {
              setParentChildrenLoading(false);
            }
          });
      } else {
        // Tài khoản Phụ huynh đăng nhập bằng Email / Mật khẩu
        setCurrentMember(null);
        const parent = buildParentFromFirebaseUser(fbUser, true);
        setCurrentParent(parent);
        void loadLinkedParentChildren(fbUser.uid);
      }
    });

    return () => unsubscribe();
  }, [loadLinkedParentChildren]);

  // Universal Card Editor state
  const [editCardData, setEditCardData] = useState<EditableCardPayload | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Hidden admin button toggle state (Ctrl + K)
  const [showAdminButton, setShowAdminButton] = useState<boolean>(false);

  // Hàm đăng xuất thống nhất cho Quản trị viên
  const handleAdminLogout = () => {
    logoutOnline();
    // Tăng phiên bản phiên làm việc để vô hiệu hóa mọi yêu cầu bất đồng bộ đang chạy (tránh dữ liệu cũ quay lại)
    authSessionVersionRef.current += 1;
    setIsAdmin(false);
    setIsPreviewMode(false);
    setPrivateStudents([]);
    setPrivateStudentsLoaded(false);
    setPrivateStudentsLoading(false);
    setPrivateStudentsError(null);
    setShowAdminButton(false);
    setIsAdminModalOpen(false);
    setEditCardData(null);
    setIsEditModalOpen(false);
    setAdminNotice('Đã đăng xuất an toàn khỏi chế độ quản trị.');
    setTimeout(() => setAdminNotice(null), 3000);
  };

  // Đọc danh sách học sinh riêng tư từ Firebase (chỉ khi có phiên quản trị hợp lệ)
  const loadAdminPrivateStudents = useCallback(async (previewFlag: boolean): Promise<StudentRecord[]> => {
    const requestVersion = authSessionVersionRef.current;

    if (previewFlag && isTrustedPreviewEnvironment()) {
      const previewList = structuredClone(MOCK_PREVIEW_STUDENTS);
      if (requestVersion === authSessionVersionRef.current) {
        setPrivateStudents(previewList);
        setPrivateStudentsLoaded(true);
        setPrivateStudentsError(null);
        setPrivateStudentsLoading(false);
      }
      return previewList;
    }

    if (!isOnlineAuthenticated() || !hasPermission('admin')) {
      if (requestVersion === authSessionVersionRef.current) {
        setPrivateStudents([]);
        setPrivateStudentsLoaded(false);
        setPrivateStudentsLoading(false);
      }
      throw new Error('Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    setPrivateStudentsLoading(true);
    setPrivateStudentsError(null);
    try {
      const loaded = await loadPrivateStudents();
      // Chống race condition: nếu quản trị viên đã đăng xuất trước khi Firebase phản hồi, hủy cập nhật UI
      if (requestVersion !== authSessionVersionRef.current || !isOnlineAuthenticated()) {
        return [];
      }
      const normalized = (loaded || []).map((st) => ({
        ...st,
        campus: st.campus || 'Trường chính',
      }));
      setPrivateStudents(normalized);
      setPrivateStudentsLoaded(true);
      setPrivateStudentsError(null);
      return normalized;
    } catch (err: any) {
      if (requestVersion !== authSessionVersionRef.current) {
        return [];
      }
      const errMsg = err?.message || 'Không thể tải danh sách học sinh từ Firebase.';
      setPrivateStudentsError(errMsg);
      // Nếu token hết hạn và onlineStore đã thu hồi phiên, yêu cầu đăng nhập lại và xóa dữ liệu khỏi UI
      if (!isOnlineAuthenticated()) {
        setIsAdmin(false);
        setIsPreviewMode(false);
        setPrivateStudents([]);
        setPrivateStudentsLoaded(false);
      }
      throw new Error(errMsg);
    } finally {
      if (requestVersion === authSessionVersionRef.current) {
        setPrivateStudentsLoading(false);
      }
    }
  }, []);

  // Kích hoạt phiên quản trị sau khi đăng nhập thành công và đồng bộ ngay danh sách học sinh riêng tư
  const handleSyncPrivateStudentsAfterLogin = useCallback(
    async (previewFlag: boolean): Promise<StudentRecord[]> => {
      authSessionVersionRef.current += 1;
      setIsAdmin(true);
      setIsPreviewMode(previewFlag);
      return loadAdminPrivateStudents(previewFlag);
    },
    [loadAdminPrivateStudents]
  );

  // Lưu danh sách học sinh riêng tư lên Firebase và đọc lại từ Firebase để đối chiếu xác nhận
  const handleSavePrivateStudents = useCallback(
    async (studentsToSave: StudentRecord[]): Promise<StudentRecord[]> => {
      if (!Array.isArray(studentsToSave) || studentsToSave.length === 0) {
        throw new Error('Không cho phép lưu hoặc ghi đè danh sách học sinh bằng danh sách rỗng.');
      }

      const validatedStudents = deduplicateStudents(studentsToSave);
      if (validatedStudents.length === 0) {
        throw new Error('Danh sách học sinh không có bản ghi hợp lệ để lưu.');
      }

      if (isPreviewMode && isTrustedPreviewEnvironment()) {
        setPrivateStudents(validatedStudents);
        setPrivateStudentsLoaded(true);
        setPrivateStudentsError(null);
        return validatedStudents;
      }

      if (!isOnlineAuthenticated() || !hasPermission('admin')) {
        setIsAdmin(false);
        setPrivateStudents([]);
        setPrivateStudentsLoaded(false);
        throw new Error('Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại để lưu dữ liệu.');
      }

      const requestVersion = authSessionVersionRef.current;
      await savePrivateStudents(validatedStudents);

      // Đọc lại từ Firebase để đối chiếu chắc chắn dữ liệu đã được lưu thành công
      const verified = await loadPrivateStudents();
      if (requestVersion !== authSessionVersionRef.current || !isOnlineAuthenticated()) {
        return [];
      }

      const normalizedVerified = (verified || []).map((st) => ({
        ...st,
        campus: st.campus || 'Trường chính',
      }));
      setPrivateStudents(normalizedVerified);
      setPrivateStudentsLoaded(true);
      setPrivateStudentsError(null);

      return normalizedVerified;
    },
    [isPreviewMode]
  );

  // Nếu có phiên quản trị Firebase hợp lệ sau khi khôi phục trạng thái, tự động nạp danh sách học sinh
  useEffect(() => {
    if (isTrustedPreviewEnvironment()) return;
    if (isOnlineAuthenticated() && hasPermission('admin')) {
      if (!isAdmin) {
        setIsAdmin(true);
        setIsPreviewMode(false);
      }
      if (!privateStudentsLoaded && !privateStudentsLoading && !privateStudentsError) {
        void loadAdminPrivateStudents(false).catch(() => {});
      }
    }
  }, [
    isAdmin,
    privateStudentsLoaded,
    privateStudentsLoading,
    privateStudentsError,
    loadAdminPrivateStudents,
  ]);

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
      setContent((prev) => {
        let mergedNews = remoteData.news || prev.news;
        if (Array.isArray(prev.news) && Array.isArray(remoteData.news)) {
          const remoteNewsIds = new Set(remoteData.news.map((n: any) => n.id));
          const localOnlyNews = prev.news.filter(
            (n: any) => !remoteNewsIds.has(n.id) && String(n.id).startsWith('news-')
          );
          if (localOnlyNews.length > 0) {
            mergedNews = [...localOnlyNews, ...remoteData.news];
          }
        }
        return {
          ...prev,
          ...remoteData,
          news: mergedNews,
          // Giữ tách biệt tuyệt đối: publicContent không bao giờ chứa hoặc ghi đè danh sách học sinh riêng tư
          students: [],
          schoolInfo: {
            ...prev.schoolInfo,
            ...remoteSchoolInfo,
            stats: {
              ...prev.schoolInfo.stats,
              ...(remoteSchoolInfo.stats || {}),
            },
          },
        };
      });
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
                  isFeatured:
                    updatedCard.isFeatured !== undefined
                      ? updatedCard.isFeatured
                      : n.isFeatured,
                  isExternalLink: Boolean(
                    updatedCard.extraField3Value?.trim() ||
                      updatedCard.externalUrl ||
                      n.externalUrl
                  ),
                  externalUrl:
                    updatedCard.extraField3Value !== undefined
                      ? updatedCard.extraField3Value.trim()
                      : (updatedCard.externalUrl || n.externalUrl),
                  sourceName:
                    updatedCard.extraField4Value !== undefined
                      ? updatedCard.extraField4Value.trim()
                      : (updatedCard.sourceName || n.sourceName),
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
                  highlight:
                    updatedCard.highlight !== undefined
                      ? updatedCard.highlight
                      : a.highlight,
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
          const updatedStudents = privateStudents.map((s) =>
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
          if (isPreviewMode) {
            setPrivateStudents(updatedStudents);
            setAdminNotice(`[Xem trước AI Studio]: Đã cập nhật hồ sơ "${updatedCard.title}" trong bộ nhớ tạm.`);
          } else {
            setAdminNotice('⏳ Đang lưu hồ sơ học sinh lên khu vực bảo mật Firebase...');
            void handleSavePrivateStudents(updatedStudents)
              .then((verified) =>
                setAdminNotice(`✅ Đã lưu và đối chiếu ${verified.length} hồ sơ học sinh trên Firebase.`)
              )
              .catch((e) => setAdminNotice(`❌ CHƯA lưu hồ sơ học sinh lên Firebase: ${e.message}`));
          }
          setTimeout(() => setAdminNotice(null), 4000);
          return;
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
    } else if (isOnlineAuthenticated()) {
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

  // Nhanh chóng bật/tắt ghim bài đăng nổi bật lên Trang Chủ
  const handleToggleFeatureNews = (newsId: string) => {
    const target = content.news.find((n) => n.id === newsId);
    if (!target) return;
    const nextFeatured = !target.isFeatured;
    const nextContent: SiteContent = {
      ...content,
      news: content.news.map((n) =>
        n.id === newsId ? { ...n, isFeatured: nextFeatured } : n
      ),
    };
    setContent(nextContent);
    if (isPreviewMode) {
      setAdminNotice(
        nextFeatured
          ? `[Xem trước] Đã ghim bài "${target.title}" lên Trang Chủ!`
          : `[Xem trước] Đã bỏ ghim bài "${target.title}" khỏi Trang Chủ.`
      );
    } else if (isOnlineAuthenticated()) {
      setAdminNotice('Đang lưu thay đổi ghim lên Firebase...');
      void saveOnlineContent(nextContent)
        .then(() =>
          setAdminNotice(
            nextFeatured
              ? `Đã ghim "${target.title}" lên Trang Chủ (Firebase).`
              : `Đã bỏ ghim "${target.title}" khỏi Trang Chủ (Firebase).`
          )
        )
        .catch((e) => setAdminNotice(`CHƯA lưu lên Firebase: ${e.message}`));
    } else {
      saveSiteContentLocal(nextContent);
      setAdminNotice(
        nextFeatured
          ? `Đã ghim nổi bật bài "${target.title}" lên đầu Trang Chủ!`
          : `Đã bỏ ghim bài "${target.title}" khỏi Trang Chủ.`
      );
    }
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Đăng tin bài mới hoặc chia sẻ link bài báo từ Internet
  const handleAddNews = async (newNews: Omit<NewsItem, 'id'>): Promise<boolean> => {
    const item: NewsItem = {
      id: `news-${Date.now()}`,
      title: newNews.title.trim(),
      category: newNews.category || 'tin-tuc',
      categoryLabel:
        newNews.categoryLabel || (newNews.isExternalLink ? 'Tin Báo Chí' : 'Tin Tức'),
      summary: newNews.summary.trim(),
      content: (newNews.content || newNews.summary || newNews.title).trim(),
      date: newNews.date?.trim() || new Date().toLocaleDateString('vi-VN'),
      author:
        newNews.author?.trim() ||
        (newNews.sourceName ? `Nguồn: ${newNews.sourceName.trim()}` : 'Ban Truyền Thông TH Lê Lợi'),
      imageUrl:
        newNews.imageUrl?.trim() ||
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80',
      isFeatured: Boolean(newNews.isFeatured),
      isExternalLink: Boolean(newNews.isExternalLink || newNews.externalUrl),
      externalUrl: newNews.externalUrl?.trim() || undefined,
      sourceName:
        newNews.sourceName?.trim() ||
        (newNews.isExternalLink || newNews.externalUrl ? 'Báo chí / Internet' : undefined),
    };

    const nextContent: SiteContent = {
      ...content,
      news: [item, ...content.news],
    };

    if (isPreviewMode) {
      setContent(nextContent);
      setAdminNotice(
        item.isExternalLink
          ? `[Xem trước AI Studio] Đã đăng bài chia sẻ từ ${item.sourceName || 'Internet'}: "${item.title}"!`
          : `[Xem trước AI Studio] Đã đăng bài viết mới: "${item.title}"!`
      );
      setTimeout(() => setAdminNotice(null), 4000);
      return true;
    }

    if (!isOnlineAuthenticated()) {
      const errMsg =
        'Chưa đăng nhập Firebase Admin! Quý thầy cô vui lòng bấm nút "Quản trị" trên thanh menu để đăng nhập trước khi đăng bài lên website chính thức.';
      setAdminNotice(`⚠️ ${errMsg}`);
      setTimeout(() => setAdminNotice(null), 6000);
      throw new Error(errMsg);
    }

    setAdminNotice('⏳ Đang lưu bài viết lên hệ thống Firebase Production...');
    try {
      await saveOnlineContent(nextContent);
      // CHỈ KHI FIREBASE XÁC NHẬN ĐÃ LƯU THÀNH CÔNG:
      setContent(nextContent);
      saveSiteContentLocal(nextContent);
      setAdminNotice(
        item.isExternalLink
          ? `✅ Đã đăng và lưu trực tuyến thành công bài chia sẻ từ ${item.sourceName || 'Internet'} lên Firebase!`
          : `✅ Đã đăng và lưu trực tuyến thành công bài viết "${item.title}" lên Firebase!`
      );
      setTimeout(() => setAdminNotice(null), 4000);
      return true;
    } catch (err: any) {
      console.error('Lỗi khi lưu tin tức lên Firebase:', err);
      const errMsg = err?.message || 'Lỗi mạng khi kết nối tới Firebase';
      setAdminNotice(`❌ Chưa thể lưu lên Firebase: ${errMsg}`);
      setTimeout(() => setAdminNotice(null), 5000);
      throw new Error(errMsg);
    }
  };

  // Xóa tin tức
  const handleDeleteNews = (newsId: string) => {
    const target = content.news.find((n) => n.id === newsId);
    const nextContent: SiteContent = {
      ...content,
      news: content.news.filter((n) => n.id !== newsId),
    };
    setContent(nextContent);
    if (!isPreviewMode) {
      if (isOnlineAuthenticated()) {
        saveOnlineContent(nextContent).catch((err) => {
          console.error('Lỗi khi xóa bài viết trên Firebase:', err);
        });
      }
      saveSiteContentLocal(nextContent);
    }
    setAdminNotice(`Đã xóa bài viết "${target?.title || ''}".`);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Nhanh chóng bật/tắt làm nổi bật hoạt động trên Trang Chủ
  const handleToggleHighlightActivity = (actId: string) => {
    const target = content.activities.find((a) => a.id === actId);
    if (!target) return;
    const nextHighlight = !target.highlight;
    const nextContent: SiteContent = {
      ...content,
      activities: content.activities.map((a) =>
        a.id === actId ? { ...a, highlight: nextHighlight } : a
      ),
    };
    setContent(nextContent);
    if (isPreviewMode) {
      setAdminNotice(
        nextHighlight
          ? `[Xem trước] Đã đưa hoạt động "${target.title}" lên Trang Chủ!`
          : `[Xem trước] Đã bỏ nổi bật hoạt động "${target.title}".`
      );
    } else if (isOnlineAuthenticated()) {
      setAdminNotice('Đang lưu thay đổi hoạt động lên Firebase...');
      void saveOnlineContent(nextContent)
        .then(() =>
          setAdminNotice(
            nextHighlight
              ? `Đã đưa hoạt động "${target.title}" lên Trang Chủ.`
              : `Đã bỏ nổi bật hoạt động "${target.title}".`
          )
        )
        .catch((e) => setAdminNotice(`CHƯA lưu lên Firebase: ${e.message}`));
    } else {
      saveSiteContentLocal(nextContent);
      setAdminNotice(
        nextHighlight
          ? `Đã làm nổi bật hoạt động "${target.title}" trên Trang Chủ!`
          : `Đã hủy nổi bật hoạt động "${target.title}".`
      );
    }
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Document download counter (chỉ tăng khi mở tài liệu có liên kết thật hợp lệ)
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

  // Member Google login success (chỉ chấp nhận phiên Google đã được Firebase Authentication xác thực thật)
  const handleMemberLoginSuccess = (member: MemberUser) => {
    const verifiedFromFirebase = getCurrentAuthenticatedGoogleMember();
    const accepted = verifiedFromFirebase || (
      member.provider === 'google' && member.uid && member.email
        ? { ...member, role: 'Thành viên' as const }
        : null
    );
    if (!accepted) {
      setAdminNotice('Chỉ chấp nhận đăng nhập thành viên qua Google Sign-In chính thức của Firebase.');
      setTimeout(() => setAdminNotice(null), 4000);
      return;
    }
    setCurrentMember(accepted);
    setMemberLogList((prev) => [accepted, ...prev.filter((m) => m.email !== accepted.email)]);
    setAdminNotice(`Đã đăng nhập thành viên Google: ${accepted.email}`);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Parent Email/Password login success
  const handleParentLoginSuccess = (parent: ParentUser) => {
    setCurrentMember(null);
    setCurrentParent(parent);
    void loadLinkedParentChildren(parent.uid);
    setAdminNotice(`Đã đăng nhập tài khoản phụ huynh: ${parent.email}`);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Đăng xuất thật khỏi Firebase Auth cho cả Thành viên Google & Phụ huynh
  const handleFirebaseUserLogout = async () => {
    firebaseUserVersionRef.current += 1;
    try {
      await signOutFirebaseUser();
    } catch {
      // Vẫn xóa sạch trạng thái trên giao diện
    }
    setCurrentMember(null);
    setCurrentParent(null);
    setParentChildren([]);
    setParentChildrenError(null);
    setParentChildrenLoading(false);
    setAdminNotice('Đã đăng xuất an toàn khỏi hệ thống.');
    setTimeout(() => setAdminNotice(null), 3000);
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
        currentParent={currentParent}
        onOpenMemberLogin={() => setIsMemberModalOpen(true)}
        onMemberLogout={() => {
          void handleFirebaseUserLogout();
        }}
        onParentLogout={() => {
          void handleFirebaseUserLogout();
        }}
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
            onToggleFeatureNews={handleToggleFeatureNews}
            onToggleHighlightActivity={handleToggleHighlightActivity}
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
            onToggleFeatureNews={handleToggleFeatureNews}
            onAddNews={handleAddNews}
            onDeleteNews={handleDeleteNews}
          />
        )}

        {currentSection === 'activities' && (
          <ActivitiesSection
            activities={content.activities}
            isAdmin={isAdmin}
            onEditCard={handleOpenEditCard}
            onToggleHighlightActivity={handleToggleHighlightActivity}
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
            students={isAdmin ? privateStudents : []}
            isAdmin={isAdmin}
            isLoading={privateStudentsLoading}
            loadError={privateStudentsError}
            onReloadStudents={() => {
              void loadAdminPrivateStudents(isPreviewMode).catch(() => {});
            }}
            onEditCard={handleOpenEditCard}
            onOpenAdmin={() => {
              setAdminInitialTab('students');
              setIsAdminModalOpen(true);
            }}
            onSavePrivateStudents={async (newStudents) => {
              const verified = await handleSavePrivateStudents(newStudents);
              setAdminNotice(
                isPreviewMode
                  ? `[Xem trước AI Studio]: Đã cập nhật ${verified.length} học sinh trong bộ nhớ tạm.`
                  : `✅ Đã lưu và đối chiếu thành công ${verified.length} hồ sơ học sinh trên Firebase.`
              );
              setTimeout(() => setAdminNotice(null), 4500);
              return verified;
            }}
            currentParent={currentParent}
            currentMember={currentMember}
            parentChildren={parentChildren}
            parentChildrenLoading={parentChildrenLoading}
            parentChildrenError={parentChildrenError}
            onParentLoginSuccess={handleParentLoginSuccess}
            onParentLogout={() => {
              void handleFirebaseUserLogout();
            }}
            onReloadParentChildren={() => {
              if (currentParent?.uid) {
                void loadLinkedParentChildren(currentParent.uid);
              }
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
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminInitialTab('school');
        }}
        isAdmin={isAdmin}
        onLoginSuccess={(isPreview = false) => {
          setIsAdmin(true);
          setIsPreviewMode(isPreview);
        }}
        onLogout={handleAdminLogout}
        content={content}
        privateStudents={isAdmin ? privateStudents : []}
        privateStudentsLoading={privateStudentsLoading}
        privateStudentsLoaded={privateStudentsLoaded}
        privateStudentsError={privateStudentsError}
        onSyncPrivateStudentsAfterLogin={handleSyncPrivateStudentsAfterLogin}
        onReloadPrivateStudents={() => loadAdminPrivateStudents(isPreviewMode)}
        onSavePrivateStudents={handleSavePrivateStudents}
        onSaveContent={(newContent, published = false) => {
          const publicOnlyContent: SiteContent = { ...newContent, students: [] };
          if (!isPreviewMode && !onlineEnabled) saveSiteContentLocal(publicOnlyContent, !published);
          setContent(publicOnlyContent);
        }}
        onResetContent={() => {
          const def = isPreviewMode
            ? { ...resetSiteContentToDefault(), students: [] }
            : { ...resetSiteContentToDefault(), students: [] };
          setContent(def);
        }}
        memberLogList={memberLogList}
        initialTab={adminInitialTab}
      />

      {/* Member Login Modal */}
      <MemberLoginModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        currentMember={currentMember}
        onLoginSuccess={handleMemberLoginSuccess}
        onLogout={() => {
          void handleFirebaseUserLogout();
        }}
        onOpenParentLookup={() => {
          setIsMemberModalOpen(false);
          handleNavigate('student-lookup');
        }}
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
