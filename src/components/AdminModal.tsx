import { INITIAL_SITE_CONTENT } from '../data';
import {
  onlineEnabled,
  loginOnline,
  logoutOnline,
  isOnlineAuthenticated,
  saveOnlineContent,
  loadOnlineContent,
  getFirebaseConfig,
  saveFirebaseConfig,
  isFirebaseConfigured,
  getAdminRole,
  getOnlineSession,
  migratePrivateStudentsToStudentResults,
  fetchParentLinksForAdmin,
  saveParentLinkForAdmin,
  deleteParentLinkForAdmin,
  fetchDocumentSubmissionsForAdmin,
  updateDocumentSubmissionStatusForAdmin,
  deleteDocumentSubmissionForAdmin,
  fetchMemberProfilesForAdmin,
} from '../onlineStore';
import { toSafeStudentResultDocId, validateDocumentUrl } from '../urlValidation';
import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  KeyRound,
  Save,
  Download,
  Upload,
  RefreshCcw,
  Sparkles,
  Flame,
  Settings,
  Plus,
  Trash2,
  Users,
  FileText,
  Calendar,
  Star,
  AlertTriangle,
  Github,
  CheckCircle2,
  ExternalLink,
  Search,
  Link as LinkIcon,
  Phone,
  UserCheck,
  Check,
  Copy,
  GraduationCap,
  ClipboardList,
  Clock,
  Bell,
  MessageSquareText,
  Mail,
  Eye,
} from 'lucide-react';
import {
  SiteContent,
  Teacher,
  NewsItem,
  StudentRecord,
  DocumentItem,
  MemberUser,
  ParentLinkRecord,
  DocumentSubmission,
  AdmissionRegistration,
  FeedbackSubmission,
} from '../types';
import {
  exportContentAsJson,
  fetchRemoteSiteContent,
  verifyAdminPassword,
  sha256Hash,
  setStoredAdminHash,
  INITIAL_ADMIN_PASSWORD,
} from '../siteContentSync';
import {
  getStoredRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
  clearAllRegistrations,
  exportRegistrationsToExcel,
  exportRegistrationsToCsv,
  ADMISSIONS_UPDATE_EVENT,
  syncAdmissionsWithFirestore,
} from '../admissionsStorage';
import {
  getStoredFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  clearAllFeedback,
  exportFeedbackToExcel,
  exportFeedbackToCsv,
  FEEDBACK_UPDATE_EVENT,
  NEW_FEEDBACK_NOTIFICATION_EVENT,
  syncFeedbackWithFirestore,
} from '../feedbackStorage';
import { generateTeacherBioWithAI } from '../geminiConfig';
import {
  downloadStudentExcelTemplate,
  exportStudentsToExcel,
  parseStudentExcelFile,
  deduplicateStudents,
  mergeStudentLists,
} from '../studentExcelHelper';
import {
  isTrustedPreviewEnvironment,
  MOCK_PREVIEW_STUDENTS,
  MOCK_PREVIEW_ADMISSIONS,
  MOCK_PREVIEW_FEEDBACK,
} from '../authEnvironment';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: (isPreview?: boolean) => void;
  onLogout: () => void;
  content: SiteContent;
  privateStudents: StudentRecord[];
  privateStudentsLoading: boolean;
  privateStudentsLoaded: boolean;
  privateStudentsError: string | null;
  onSyncPrivateStudentsAfterLogin: (isPreview: boolean) => Promise<StudentRecord[]>;
  onReloadPrivateStudents: () => Promise<StudentRecord[]>;
  onSavePrivateStudents: (students: StudentRecord[]) => Promise<StudentRecord[]>;
  onSaveContent: (newContent: SiteContent, published?: boolean) => void;
  onResetContent: () => void;
  memberLogList: MemberUser[];
  initialTab?:
    | 'school'
    | 'staff'
    | 'news'
    | 'students'
    | 'documents'
    | 'members'
    | 'admissions_registrations'
    | 'feedback'
    | 'password'
    | 'sync';
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
  content,
  privateStudents,
  privateStudentsLoading,
  privateStudentsLoaded,
  privateStudentsError,
  onSyncPrivateStudentsAfterLogin,
  onReloadPrivateStudents,
  onSavePrivateStudents,
  onSaveContent,
  onResetContent,
  memberLogList,
  initialTab,
}) => {
  // Environment-based login authorization
  const canUsePreviewAuth = isTrustedPreviewEnvironment();
  const [loginMode, setLoginMode] = useState<'firebase' | 'school_master'>('firebase');
  const [isPreviewSession, setIsPreviewSession] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!canUsePreviewAuth && loginMode !== 'firebase') {
      setLoginMode('firebase');
    }
  }, [canUsePreviewAuth, loginMode]);

  useEffect(() => {
    if (!isAdmin) {
      setIsPreviewSession(false);
      setPassword('');
      setLoginError('');
      setStudentBaseline(null);
      setImportPreview(null);
      setImportError(null);
      setParentLinks([]);
      setDocSubmissions([]);
      setRemoteMembers([]);
      setMigrationReportMsg(null);
      setParentLinkMsg(null);
      setDocSubMsg(null);
      setDraft((prev) => ({ ...prev, students: [] }));
    }
  }, [isAdmin]);

  const [username, setUsername] = useState(() => {
    const conf = getFirebaseConfig();
    return conf.adminEmail || 'truongthleloipongdrang@gmail.com';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [showFirebaseSettings, setShowFirebaseSettings] = useState(false);
  const [fbApiKeyInput, setFbApiKeyInput] = useState(() => getFirebaseConfig().apiKey);
  const [fbProjectIdInput, setFbProjectIdInput] = useState(() => getFirebaseConfig().projectId);
  const [fbSaveMsg, setFbSaveMsg] = useState('');

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<
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
  >(initialTab || 'school');

  // Admissions registrations state
  const [admissionsList, setAdmissionsList] = useState<AdmissionRegistration[]>(() =>
    getStoredRegistrations()
  );
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCampusFilter, setRegCampusFilter] = useState('all');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | 'pending' | 'contacted'>('all');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [confirmDeleteRegId, setConfirmDeleteRegId] = useState<string | null>(null);
  const [confirmClearAllAdmissions, setConfirmClearAllAdmissions] = useState(false);

  const handleDeleteAdmissionReg = (id: string) => {
    deleteRegistration(id);
    setAdmissionsList((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteRegId(null);
  };

  const handleClearAllAdmissionRegs = () => {
    clearAllRegistrations();
    setAdmissionsList([]);
    setConfirmClearAllAdmissions(false);
  };

  // Feedback submissions state (Ý kiến đóng góp / phản ánh từ phụ huynh & nhân dân)
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>(() =>
    getStoredFeedback()
  );
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [copiedFeedbackPhoneId, setCopiedFeedbackPhoneId] = useState<string | null>(null);
  const [confirmDeleteFeedbackId, setConfirmDeleteFeedbackId] = useState<string | null>(null);
  const [confirmClearAllFeedback, setConfirmClearAllFeedback] = useState(false);
  const [viewingFeedbackDetail, setViewingFeedbackDetail] = useState<FeedbackSubmission | null>(null);
  const [syncingAdmissions, setSyncingAdmissions] = useState(false);
  const [syncingFeedback, setSyncingFeedback] = useState(false);

  const handleDeleteFeedbackItem = (id: string) => {
    deleteFeedback(id);
    setFeedbackList((prev) => prev.filter((f) => f.id !== id));
    setConfirmDeleteFeedbackId(null);
  };

  const handleClearAllFeedbackItems = () => {
    clearAllFeedback();
    setFeedbackList([]);
    setConfirmClearAllFeedback(false);
  };

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Listen to new admission registrations in real time
  useEffect(() => {
    const handleUpdate = () => {
      setAdmissionsList(getStoredRegistrations());
    };
    window.addEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
  }, []);

  // Listen to new feedback submissions in real time
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbackList(getStoredFeedback());
    };
    if (isOpen) {
      setFeedbackList(getStoredFeedback());
    }
    window.addEventListener(FEEDBACK_UPDATE_EVENT, handleFeedbackUpdate);
    window.addEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFeedbackUpdate);
    return () => {
      window.removeEventListener(FEEDBACK_UPDATE_EVENT, handleFeedbackUpdate);
      window.removeEventListener(NEW_FEEDBACK_NOTIFICATION_EVENT, handleFeedbackUpdate);
    };
  }, [isOpen]);

  const pendingRegistrationsCount = admissionsList.filter((r) => r.status === 'pending').length;
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length;

  // Tự động tải lại danh sách ý kiến đóng góp khi mở tab 'feedback'
  useEffect(() => {
    if (isOpen && activeTab === 'feedback') {
      if (isTrustedPreviewEnvironment()) {
        setFeedbackList([...MOCK_PREVIEW_FEEDBACK]);
      } else if (isOnlineAuthenticated()) {
        syncFeedbackWithFirestore(false)
          .then((list) => setFeedbackList(list))
          .catch(() => {});
      } else {
        setFeedbackList(getStoredFeedback());
      }
    }
  }, [isOpen, activeTab]);

  const filteredFeedback = feedbackList.filter((f) => {
    const q = feedbackSearchQuery.toLowerCase().trim();
    const fullName = (f.fullName || '').toLowerCase();
    const phone = f.phone || '';
    const email = (f.email || '').toLowerCase();
    const message = (f.message || '').toLowerCase();
    const matchQuery =
      !q ||
      fullName.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      message.includes(q);
    const matchStatus = feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter;
    return matchQuery && matchStatus;
  });

  // Working copy of content (tách riêng public content và danh sách học sinh riêng tư đã nạp từ Firebase)
  const [draft, setDraft] = useState<SiteContent>(() => ({
    ...JSON.parse(JSON.stringify(content)),
    students: JSON.parse(JSON.stringify(privateStudents)),
  }));

  // Đồng bộ nội dung công khai khi mở modal hoặc khi publicContent thay đổi mà KHÔNG ghi đè danh sách học sinh riêng tư
  useEffect(() => {
    if (isOpen) {
      setDraft((prev) => ({
        ...JSON.parse(JSON.stringify(content)),
        students: isAdmin
          ? (privateStudentsLoaded ? JSON.parse(JSON.stringify(privateStudents)) : prev.students)
          : [],
      }));
    }
  }, [isOpen, content]);

  // Đồng bộ danh sách học sinh riêng tư từ App state khi tải xong hoặc sau khi lưu/đối chiếu Firebase
  useEffect(() => {
    if (isAdmin && privateStudentsLoaded) {
      const cloned = JSON.parse(JSON.stringify(privateStudents)) as StudentRecord[];
      setDraft((prev) => ({ ...prev, students: cloned }));
      setStudentBaseline(JSON.parse(JSON.stringify(privateStudents)) as StudentRecord[]);
    }
  }, [isAdmin, privateStudents, privateStudentsLoaded]);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Password change form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // Clean up any previously stored browser PAT (tokens should never be stored in browser)
  useEffect(() => { localStorage.removeItem('th_leloi_github_pat_v1'); }, []);
  const [savingOnline, setSavingOnline] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');
  const [studentBaseline, setStudentBaseline] = useState<SiteContent['students'] | null>(null);

  // AI loading per teacher
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);

  // Student Excel Import states
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: StudentRecord[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);

  // Student Results Migration & Parent Links Management states (Admin only)
  const [migratingResults, setMigratingResults] = useState(false);
  const [migrationReportMsg, setMigrationReportMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [parentLinks, setParentLinks] = useState<ParentLinkRecord[]>([]);
  const [loadingParentLinks, setLoadingParentLinks] = useState(false);
  const [savingParentLink, setSavingParentLink] = useState(false);
  const [parentLinkUidInput, setParentLinkUidInput] = useState('');
  const [parentLinkEmailInput, setParentLinkEmailInput] = useState('');
  const [parentLinkNameInput, setParentLinkNameInput] = useState('');
  const [selectedStudentIdsForParent, setSelectedStudentIdsForParent] = useState<string[]>([]);
  const [parentLinkMsg, setParentLinkMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Document Submissions Moderation states (Admin only)
  const [docSubmissions, setDocSubmissions] = useState<DocumentSubmission[]>([]);
  const [loadingDocSubmissions, setLoadingDocSubmissions] = useState(false);
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);
  const [docSubMsg, setDocSubMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Remote Member Profiles from Firestore (Admin only)
  const [remoteMembers, setRemoteMembers] = useState<MemberUser[]>([]);
  const [loadingRemoteMembers, setLoadingRemoteMembers] = useState(false);

  // Tự động tải dữ liệu liên kết phụ huynh / học liệu chờ duyệt / thành viên khi mở đúng tab
  useEffect(() => {
    if (!isOpen || !isAdmin || isPreviewSession || !isOnlineAuthenticated()) return;

    if (activeTab === 'students') {
      setLoadingParentLinks(true);
      fetchParentLinksForAdmin()
        .then((list) => setParentLinks(list))
        .catch(() => {})
        .finally(() => setLoadingParentLinks(false));
    } else if (activeTab === 'documents') {
      setLoadingDocSubmissions(true);
      fetchDocumentSubmissionsForAdmin()
        .then((list) => setDocSubmissions(list))
        .catch(() => {})
        .finally(() => setLoadingDocSubmissions(false));
    } else if (activeTab === 'members') {
      setLoadingRemoteMembers(true);
      fetchMemberProfilesForAdmin()
        .then((list) => setRemoteMembers(list))
        .catch(() => {})
        .finally(() => setLoadingRemoteMembers(false));
    }
  }, [isOpen, isAdmin, isPreviewSession, activeTab]);

  const handleBackupStudentsJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'siteData/privateStudents',
      totalStudents: draft.students.length,
      students: draft.students,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-hoc-sinh-th-le-loi-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMigrationReportMsg({
      type: 'success',
      text: `Đã tải tệp sao lưu JSON gồm ${draft.students.length} hồ sơ học sinh về máy tính.`,
    });
  };

  const handleSyncToStudentResults = async () => {
    if (migratingResults) return;
    if (privateStudentsLoading || privateStudentsError) {
      setMigrationReportMsg({
        type: 'error',
        text: 'Chưa tải xong dữ liệu gốc từ siteData/privateStudents. Vui lòng bấm "Tải Lại Firebase" trước khi sao chép sang studentResults.',
      });
      return;
    }
    if (draft.students.length === 0) {
      setMigrationReportMsg({
        type: 'error',
        text: 'Danh sách học sinh hiện đang trống. Không thể sao chép sang studentResults.',
      });
      return;
    }
    const dedupedDraft = deduplicateStudents(draft.students);
    const dedupedBaseline = studentBaseline !== null ? deduplicateStudents(studentBaseline) : null;
    if (
      dedupedBaseline !== null &&
      JSON.stringify(dedupedDraft) !== JSON.stringify(dedupedBaseline)
    ) {
      setMigrationReportMsg({
        type: 'error',
        text: 'Bạn có thay đổi danh sách học sinh chưa lưu. Vui lòng bấm "Lưu Lên Firebase" để lưu vào dữ liệu gốc siteData/privateStudents trước khi sao chép sang studentResults.',
      });
      return;
    }
    setMigratingResults(true);
    setMigrationReportMsg(null);
    try {
      const report = await migratePrivateStudentsToStudentResults();
      if (
        report.failedItems.length > 0 ||
        report.missingVerifiedIds.length > 0 ||
        !report.originalIntact
      ) {
        setMigrationReportMsg({
          type: 'error',
          text: `Sao chép chưa hoàn tất: đã ghi ${report.syncedCount}/${report.totalInput}, đối chiếu khớp ${report.verifiedMatchedCount}/${report.totalInput} bản ghi trên studentResults (${report.failedItems.length} lỗi${report.failedItems[0] ? `: ${report.failedItems[0].studentCode} - ${report.failedItems[0].reason}` : ''}). Dữ liệu gốc siteData/privateStudents hiện có ${report.originalCountAfter} bản ghi.`,
        });
      } else {
        setMigrationReportMsg({
          type: 'success',
          text: `✅ Sao chép & đối chiếu thành công ${report.verifiedMatchedCount}/${report.totalInput} học sinh từ siteData/privateStudents sang collection studentResults (tổng studentResults: ${report.verifiedCount} bản ghi, 0 lỗi, 0 trùng lặp). Dữ liệu gốc siteData/privateStudents vẫn còn nguyên vẹn ${report.originalCountAfter}/${report.originalCountBefore} bản ghi.`,
        });
      }
    } catch (err: any) {
      setMigrationReportMsg({
        type: 'error',
        text: err?.message || 'Không thể sao chép sang studentResults.',
      });
    } finally {
      setMigratingResults(false);
    }
  };

  const handleSaveParentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingParentLink) return;
    setParentLinkMsg(null);

    const selectedStudents = draft.students.filter((st) =>
      selectedStudentIdsForParent.includes(toSafeStudentResultDocId(st))
    );
    const studentIds = selectedStudents.map((st) => toSafeStudentResultDocId(st));
    const studentCodes = selectedStudents.map((st) => st.studentCode);

    setSavingParentLink(true);
    try {
      const saved = await saveParentLinkForAdmin({
        parentUid: parentLinkUidInput,
        parentEmail: parentLinkEmailInput,
        parentName: parentLinkNameInput,
        studentIds,
        studentCodes,
      });
      setParentLinks((prev) => [
        saved,
        ...prev.filter((item) => item.parentUid !== saved.parentUid),
      ]);
      setParentLinkUidInput('');
      setParentLinkEmailInput('');
      setParentLinkNameInput('');
      setSelectedStudentIdsForParent([]);
      setParentLinkMsg({
        type: 'success',
        text: `Đã lưu liên kết tài khoản phụ huynh ${saved.parentEmail} với ${saved.studentIds.length} học sinh (${saved.studentCodes.join(', ')}).`,
      });
    } catch (err: any) {
      setParentLinkMsg({
        type: 'error',
        text: err?.message || 'Không thể lưu liên kết phụ huynh.',
      });
    } finally {
      setSavingParentLink(false);
    }
  };

  const handleDeleteParentLink = async (parentUid: string) => {
    setParentLinkMsg(null);
    try {
      await deleteParentLinkForAdmin(parentUid);
      setParentLinks((prev) => prev.filter((item) => item.parentUid !== parentUid));
      setParentLinkMsg({
        type: 'success',
        text: `Đã hủy liên kết phụ huynh (UID: ${parentUid}).`,
      });
    } catch (err: any) {
      setParentLinkMsg({
        type: 'error',
        text: err?.message || 'Không thể hủy liên kết phụ huynh.',
      });
    }
  };

  const handleApproveSubmission = async (sub: DocumentSubmission) => {
    if (processingSubId) return;
    const urlCheck = validateDocumentUrl(sub.downloadUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      setDocSubMsg({
        type: 'error',
        text: `Không thể duyệt "${sub.title}" vì liên kết không hợp lệ: ${urlCheck.error}`,
      });
      return;
    }

    setProcessingSubId(sub.id);
    setDocSubMsg(null);
    try {
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: sub.title,
        category: sub.category,
        categoryLabel: sub.categoryLabel,
        fileSize: sub.fileSize || 'Liên kết trực tuyến',
        fileType: sub.fileType || 'Link trực tuyến',
        uploadDate: new Date().toLocaleDateString('vi-VN'),
        uploaderName: sub.submittedByName,
        uploaderEmail: sub.submittedByEmail,
        downloadCount: 0,
        description: sub.description,
        downloadUrl: urlCheck.normalizedUrl,
      };

      const nextDraft: SiteContent = {
        ...draft,
        documents: [newDoc, ...draft.documents],
      };

      await saveOnlineContent(nextDraft);
      await updateDocumentSubmissionStatusForAdmin(sub.id, 'approved', 'Đã duyệt và xuất bản vào Kho Tài Liệu');

      setDraft(nextDraft);
      onSaveContent(nextDraft, true);
      setDocSubmissions((prev) =>
        prev.map((item) => (item.id === sub.id ? { ...item, status: 'approved' } : item))
      );
      setDocSubMsg({
        type: 'success',
        text: `✅ Đã duyệt và xuất bản học liệu "${sub.title}" lên Kho Tài Liệu công khai!`,
      });
    } catch (err: any) {
      setDocSubMsg({
        type: 'error',
        text: err?.message || 'Không thể duyệt và xuất bản học liệu.',
      });
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleRejectSubmission = async (sub: DocumentSubmission) => {
    if (processingSubId) return;
    setProcessingSubId(sub.id);
    setDocSubMsg(null);
    try {
      await updateDocumentSubmissionStatusForAdmin(
        sub.id,
        'rejected',
        'Liên kết chưa phù hợp hoặc cần bổ sung mô tả rõ hơn'
      );
      setDocSubmissions((prev) =>
        prev.map((item) => (item.id === sub.id ? { ...item, status: 'rejected' } : item))
      );
      setDocSubMsg({
        type: 'success',
        text: `Đã từ chối đề xuất học liệu "${sub.title}".`,
      });
    } catch (err: any) {
      setDocSubMsg({
        type: 'error',
        text: err?.message || 'Không thể cập nhật trạng thái từ chối.',
      });
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    if (processingSubId) return;
    setProcessingSubId(subId);
    setDocSubMsg(null);
    try {
      await deleteDocumentSubmissionForAdmin(subId);
      setDocSubmissions((prev) => prev.filter((item) => item.id !== subId));
    } catch (err: any) {
      setDocSubMsg({
        type: 'error',
        text: err?.message || 'Không thể xóa đề xuất học liệu.',
      });
    } finally {
      setProcessingSubId(null);
    }
  };

  if (!isOpen) return null;

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const result = await parseStudentExcelFile(file);
    if (!result.success) {
      setImportError(result.error || 'Lỗi khi đọc file Excel.');
      e.target.value = '';
      return;
    }

    setImportPreview({
      fileName: file.name,
      students: result.data,
    });
    e.target.value = '';
  };

  const handleConfirmStudentImport = () => {
    if (!importPreview) return;
    if (!isPreviewSession && (privateStudentsLoading || Boolean(privateStudentsError))) {
      setImportError(
        'Chưa tải được danh sách học sinh gốc từ Firebase. Vui lòng bấm "Tải Lại Firebase" trước khi nhập Excel để tránh ghi đè mất dữ liệu hiện có.'
      );
      return;
    }

    const { merged, addedCount, updatedCount } = mergeStudentLists(
      draft.students,
      importPreview.students,
      importMode
    );

    if (merged.length === 0) {
      setImportError('Danh sách học sinh từ file Excel không có bản ghi hợp lệ.');
      return;
    }

    setDraft({ ...draft, students: merged });

    if (importMode === 'replace') {
      setStatusMsg({
        type: 'success',
        text: `Đã thay thế danh sách tạm bằng ${merged.length} học sinh hợp lệ từ file Excel (đã tự động lọc trùng). Nhớ bấm "Lưu Lên Firebase" để xác nhận lưu chính thức!`,
      });
    } else {
      const detailParts: string[] = [];
      if (addedCount > 0) detailParts.push(`thêm mới ${addedCount} em`);
      if (updatedCount > 0) detailParts.push(`cập nhật ${updatedCount} em đã có (không tạo trùng)`);
      const detailText = detailParts.length > 0 ? detailParts.join(', ') : 'không có thay đổi mới';
      setStatusMsg({
        type: 'success',
        text: `Đã gộp từ file Excel: ${detailText}. Tổng cộng ${merged.length} học sinh. Nhớ bấm "Lưu Lên Firebase" để xác nhận lưu chính thức!`,
      });
    }

    setImportPreview(null);
    setTimeout(() => setStatusMsg(null), 6000);
  };

  // Authentication logic cleanly separated by environment:
  // 1. Production (GitHub Pages): ONLY Firebase Authentication. NO fallbacks.
  // 2. Google AI Studio: Allows preview mode with mock data for safe UI testing.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoginError('');
    setLoggingIn(true);
    try {
      if (loginMode === 'firebase') {
        const conf = getFirebaseConfig();
        const configured = Boolean(conf.apiKey && conf.projectId);

        if (!configured) {
          setShowFirebaseSettings(true);
          throw new Error(
            'Chưa có thông số kết nối Firebase (API Key / Project ID). Quý thầy cô vui lòng mở mục "Cài đặt kết nối Firebase" bên dưới để nhập hoặc kiểm tra biến môi trường.'
          );
        }

        // 1. Xác thực an toàn qua Firebase Authentication (KHÔNG FALLBACK)
        await loginOnline(username, password);

        // 2. Đã xác thực quản trị -> Đồng bộ danh sách học sinh riêng tư vào trạng thái chung App.tsx
        setIsPreviewSession(false);
        setPassword('');
        setStatusMsg({
          type: 'success',
          text: 'Đã xác thực quản trị Firebase. Đang tải danh sách học sinh riêng tư...',
        });

        // Đồng bộ tức thì tuyển sinh và góp ý từ Cloud Firestore khi vừa đăng nhập
        syncAdmissionsWithFirestore(false).then((list) => setAdmissionsList(list)).catch(() => {});
        syncFeedbackWithFirestore(false).then((list) => setFeedbackList(list)).catch(() => {});

        try {
          const loadedStudents = await onSyncPrivateStudentsAfterLogin(false);
          setStudentBaseline(structuredClone(loadedStudents));
          setDraft({ ...structuredClone(content), students: structuredClone(loadedStudents) });
          setStatusMsg({
            type: 'success',
            text:
              loadedStudents.length > 0
                ? `Đăng nhập thành công! Đã tải ${loadedStudents.length} hồ sơ học sinh từ Firebase.`
                : 'Đăng nhập thành công! Hiện chưa có hồ sơ học sinh nào trên Firebase.',
          });
        } catch (loadErr: any) {
          // Không tự động coi danh sách học sinh là rỗng khi Firebase trả lỗi
          setStudentBaseline(null);
          setStatusMsg({
            type: 'error',
            text: `Đã đăng nhập quản trị nhưng chưa tải được danh sách học sinh từ Firebase: ${loadErr?.message || 'Lỗi kết nối'}. Dữ liệu trên Firebase vẫn được giữ nguyên.`,
          });
        }
        return;
      } else {
        // CỔNG XEM TRƯỚC GOOGLE AI STUDIO (BẢO VỆ PRODUCTION TUYỆT ĐỐI)
        if (!canUsePreviewAuth) {
          throw new Error(
            'Chức năng đăng nhập bằng mật khẩu nội bộ đã bị vô hiệu hóa trên website chính thức (Production). Vui lòng đăng nhập bằng Firebase Authentication.'
          );
        }

        const isPwValid = (await verifyAdminPassword(password)) || (await verifyAdminPassword(username));
        if (!isPwValid) {
          throw new Error(
            'Mật khẩu xem trước không chính xác. Mật khẩu mặc định xem trước: Leloi@PongDrang2026# (hoặc bgh_leloi).'
          );
        }

        // TÁCH BIỆT DỮ LIỆU: Sử dụng dữ liệu giả lập riêng biệt, tuyệt đối bảo vệ học sinh & phụ huynh thật
        const previewStudents = await onSyncPrivateStudentsAfterLogin(true);
        setDraft({ ...content, students: structuredClone(previewStudents) });
        setStudentBaseline(structuredClone(previewStudents));
        setAdmissionsList(MOCK_PREVIEW_ADMISSIONS);
        setFeedbackList(MOCK_PREVIEW_FEEDBACK);
        setIsPreviewSession(true);
        setPassword('');
      }
    } catch (error: any) {
      logoutOnline();
      setLoginError(error.message || 'Đăng nhập quản trị thất bại.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    if (!currentPw) {
      setPwMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    const isCurrentValid = await verifyAdminPassword(currentPw);
    if (!isCurrentValid) {
      setPwMsg('Mật khẩu hiện tại không đúng.');
      return;
    }
    if (newPw.length < 6) {
      setPwMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('Mật khẩu xác nhận không khớp nhau.');
      return;
    }
    const newHash = await sha256Hash(newPw);
    setStoredAdminHash(newHash);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwMsg('Đã cập nhật mật khẩu quản trị mới thành công! Mật khẩu mới có hiệu lực ngay lập tức.');
  };

  // Save changes to Firebase (if online session active) or memory preview
  const handleSaveDraft = async () => {
    if (savingOnline) return;
    setSavingOnline(true);
    setStatusMsg(null);
    try {
      if (isPreviewSession) {
        // Chế độ Xem trước AI Studio: Chỉ lưu bản nháp vào bộ nhớ trình duyệt, KHÔNG ghi lên Cloud Firestore Production
        if (draft.students.length > 0) {
          await onSavePrivateStudents(draft.students);
        }
        onSaveContent(draft, false);
        setStatusMsg({
          type: 'success',
          text: 'Đã lưu bản nháp xem trước (Google AI Studio). Dữ liệu này chỉ phục vụ tinh chỉnh giao diện và KHÔNG ghi vào Cloud Firestore Production.',
        });
        return;
      }

      if (isFirebaseConfigured() && isOnlineAuthenticated()) {
        const dedupedDraftStudents = deduplicateStudents(draft.students);
        const baselineComparison = studentBaseline !== null ? deduplicateStudents(studentBaseline) : null;
        const changedStudents =
          (baselineComparison !== null &&
            JSON.stringify(dedupedDraftStudents) !== JSON.stringify(baselineComparison)) ||
          (baselineComparison === null && !privateStudentsError && dedupedDraftStudents.length > 0);

        let savedStudentsCount: number | null = null;

        if (changedStudents) {
          if (dedupedDraftStudents.length === 0) {
            throw new Error(
              'Không được lưu danh sách học sinh rỗng. Hãy nhập danh sách hợp lệ trước khi lưu.'
            );
          }
          if (
            !window.confirm(
              `Bạn sắp lưu riêng ${dedupedDraftStudents.length} hồ sơ học sinh lên khu vực BẢO MẬT Firebase và đối chiếu lại sau khi lưu. Tiếp tục?`
            )
          ) {
            return;
          }
          const verifiedStudents = await onSavePrivateStudents(dedupedDraftStudents);
          setStudentBaseline(structuredClone(verifiedStudents));
          setDraft((prev) => ({ ...prev, students: structuredClone(verifiedStudents) }));
          savedStudentsCount = verifiedStudents.length;
        }

        await saveOnlineContent(draft);
        onSaveContent(draft, true);
        setStatusMsg({
          type: 'success',
          text:
            savedStudentsCount !== null
              ? `Đã lưu và đối chiếu thành công ${savedStudentsCount} hồ sơ học sinh cùng nội dung website lên Firebase.`
              : 'Đã lưu nội dung công khai lên Firebase thành công. Dữ liệu học sinh riêng tư vẫn được giữ nguyên an toàn.',
        });
      } else {
        throw new Error('Chưa đăng nhập Firebase Authentication. Không thể lưu dữ liệu lên hệ thống Production.');
      }
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: `Lỗi khi lưu dữ liệu: ${error.message || 'Lỗi kết nối.'}. Nội dung vẫn còn trong cửa sổ chỉnh sửa.` });
    } finally {
      setSavingOnline(false);
    }
  };

  // Public-only JSON backup. Never export private student records or authentication tokens.
  // Public-only JSON backup. Never export private student records or authentication tokens.
  const downloadPublicBackup = async () => {
    setBackupNotice('');
    try {
      if (isPreviewSession || isTrustedPreviewEnvironment()) {
        // Chế độ xem trước AI Studio: Xuất bản sao lưu dữ liệu mẫu trong bộ nhớ, tuyệt đối không truy cập Firebase Production
        const { students: _excluded, ...safe } = draft;
        const fileContent = JSON.stringify({
          format: 'th-le-loi-public-backup',
          version: 1,
          previewMode: true,
          exportedAt: new Date().toISOString(),
          content: safe,
        }, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `th-le-loi-xem-truoc-noi-dung-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        setBackupNotice('Đã tạo bản sao lưu dữ liệu xem trước (trong bộ nhớ). Thao tác hoàn toàn không truy cập Firebase Production.');
        return;
      }

      const remote = await loadOnlineContent();
      if (!remote || !remote.schoolInfo || !Array.isArray(remote.teachers)) {
        throw new Error('Chưa đọc được nội dung công khai từ Firebase.');
      }
      const { students: _excluded, ...safe } = remote;
      const fileContent = JSON.stringify({
        format: 'th-le-loi-public-backup', version: 1,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        exportedAt: new Date().toISOString(),
        content: safe,
      }, null, 2);
      const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `th-le-loi-noi-dung-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setBackupNotice('Đã tạo bản sao lưu nội dung công khai đang lưu trên Firebase. Hãy cất file ở nơi an toàn.');
    } catch (err: any) {
      setBackupNotice(`Không sao lưu được: ${err.message || 'Lỗi kết nối Firebase.'}`);
    }
  };

  const restorePublicBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || restoringBackup || savingOnline) return;
    setBackupNotice('');
    try {
      if (file.size > 950000) throw new Error('File sao lưu quá lớn (giới hạn 950 KB).');
      const data = JSON.parse(await file.text());
      if (data?.format !== 'th-le-loi-public-backup' || data?.version !== 1 || !data.content) {
        throw new Error('Không đúng định dạng sao lưu nội dung trường.');
      }
      const restored = data.content as Partial<SiteContent>;
      if (!restored.schoolInfo || typeof restored.schoolInfo.name !== 'string' ||
          !Array.isArray(restored.teachers) || !Array.isArray(restored.news) ||
          !Array.isArray(restored.documents)) {
        throw new Error('File thiếu các phần nội dung bắt buộc.');
      }
      if (Object.prototype.hasOwnProperty.call(restored, 'students')) {
        throw new Error('File chứa dữ liệu học sinh. Chỉ được khôi phục bản sao lưu nội dung công khai.');
      }

      // BẢO VỆ CHẾ ĐỘ XEM TRƯỚC: Tuyệt đối không ghi lên Cloud Firestore Production
      if (isPreviewSession || isTrustedPreviewEnvironment()) {
        const updated = { ...draft, ...restored, students: draft.students } as SiteContent;
        setDraft(updated);
        onSaveContent(updated, false);
        setBackupNotice('Đã khôi phục nội dung xem trước vào bộ nhớ tạm (Google AI Studio). Tuyệt đối không ghi lên Firebase Production.');
        return;
      }

      if (data.projectId && data.projectId !== import.meta.env.VITE_FIREBASE_PROJECT_ID) {
        throw new Error('File sao lưu không thuộc dự án Firebase của trường.');
      }

      const remote = await loadOnlineContent();
      if (!remote) throw new Error('Không tải được bản nội dung hiện tại từ Firebase.');
      if (!window.confirm(`KHÔI PHỤC NỘI DUNG CÔNG KHAI\n\nFile: ${file.name}\nNgày sao lưu: ${data.exportedAt || 'không rõ'}\n\nThao tác sẽ thay thế nội dung công khai trên Firebase cho TẤT CẢ NGƯỜI XEM. Hồ sơ học sinh riêng tư sẽ không bị thay đổi.\n\nBạn đã tải bản sao lưu hiện tại trước khi tiếp tục chưa?`)) return;
      setRestoringBackup(true);
      // Preserve private students currently loaded in the admin session; never write them.
      const updated = { ...draft, ...restored, students: draft.students } as SiteContent;
      await saveOnlineContent(updated);
      setDraft(updated);
      onSaveContent(updated, true);
      setBackupNotice('Đã khôi phục nội dung công khai lên Firebase. Hãy tải lại trang và kiểm tra.');
    } catch (err: any) {
      setBackupNotice(`Khôi phục thất bại: ${err.message || 'File không hợp lệ.'}`);
    } finally {
      setRestoringBackup(false);
    }
  };

  // Quick AI bio generation for a teacher
  const handleGenerateBio = async (teacherIndex: number) => {
    const t = draft.teachers[teacherIndex];
    if (!t) return;
    setAiGeneratingId(t.id);
    try {
      const bio = await generateTeacherBioWithAI({
        name: t.name,
        role: t.role,
        subjectOrGrade: t.subjectOrGrade,
        campus: t.campus,
        qualification: t.qualification,
        achievements: t.achievements,
      });
      const updatedTeachers = [...draft.teachers];
      updatedTeachers[teacherIndex] = { ...t, bio };
      setDraft({ ...draft, teachers: updatedTeachers });
    } finally {
      setAiGeneratingId(null);
    }
  };

  // Student CSV Export
  const exportStudentsCsv = () => {
    const headers = 'Mã HS,Họ và Tên,Lớp,Năm học,Đánh giá học tập,Đánh giá rèn luyện,Khen thưởng,GVCN\n';
    const rows = draft.students
      .map(
        (s) =>
          `"${s.studentCode}","${s.fullName}","${s.className}","${s.academicYear}","${s.academicEvaluation}","${s.conductEvaluation}","${s.awards}","${s.teacherName}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-hoc-sinh-le-loi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Member log CSV export
  const exportMembersCsv = () => {
    const headers = 'Gmail,Họ tên,Vai trò,Thời gian đăng nhập\n';
    const rows = memberLogList
      .map((m) => `"${m.email}","${m.name}","${m.role}","${m.loginAt}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-thanh-vien-gmail-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredAdmissions = admissionsList.filter((r) => {
    const q = regSearchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.parentName.toLowerCase().includes(q) ||
      r.childName.toLowerCase().includes(q) ||
      r.phone.includes(q);
    const matchCampus = regCampusFilter === 'all' || r.campusChoice.includes(regCampusFilter);
    const matchStatus = regStatusFilter === 'all' || r.status === regStatusFilter;
    return matchSearch && matchCampus && matchStatus;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold block">
                  BẢNG ĐIỀU KHIỂN QUẢN TRỊ TRƯỜNG HỌC
                </span>
                {isAdmin && (
                  isPreviewSession ? (
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                      Chế độ Xem trước (AI Studio)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                      Firebase Production
                    </span>
                  )
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isAdmin
                  ? isPreviewSession
                    ? 'Xem Trước Giao Diện Quản Trị - Google AI Studio'
                    : 'Quản Trị Nội Dung - Trường Tiểu Học Lê Lợi'
                  : 'Xác Thực Quản Trị Viên (Ctrl + K)'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning banner when active in Preview Session */}
        {isAdmin && isPreviewSession && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 text-xs text-amber-950 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>LƯU Ý XEM TRƯỚC (GOOGLE AI STUDIO):</strong> Bạn đang ở chế độ xem trước giao diện nội bộ với dữ liệu mẫu. Mọi thay đổi không ghi vào Cloud Firestore Production và không ảnh hưởng đến dữ liệu trường học.
            </span>
          </div>
        )}

        {/* Status Alert if any */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between shrink-0 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-200'
                : 'bg-red-100 text-red-900 border-b border-red-200'
            }`}
          >
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {statusMsg.text}
            </span>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content depending on login status */}
        {!isAdmin ? (
          // ================= LOGIN FORM =================
          <div className="p-6 md:p-8 max-w-lg mx-auto w-full space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Đăng Nhập Cổng Quản Trị
              </h3>
              <p className="text-xs text-slate-500">
                Ban Giám Hiệu & Cán bộ Quản trị Trường Tiểu học Lê Lợi
              </p>
            </div>

            {/* Login Mode Selector: Only displayed in trusted preview environment (AI Studio).
                On Production (GitHub Pages), ONLY Firebase Authentication is active with NO tabs. */}
            {canUsePreviewAuth ? (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('firebase');
                    setLoginError('');
                  }}
                  className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'firebase'
                      ? 'bg-white text-amber-900 shadow-xs border border-amber-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${loginMode === 'firebase' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>Firebase Authentication</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('school_master');
                    setLoginError('');
                  }}
                  className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'school_master'
                      ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${loginMode === 'school_master' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Mật khẩu Xem trước (AI Studio)</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>Cổng Quản Trị Website – Firebase Authentication</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                    Website Chính
                  </span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Đăng nhập bằng tài khoản Quản trị viên trên Google Firebase. Quyền đọc/ghi dữ liệu được xác thực trực tiếp trên Cloud Firestore Security Rules.
                </p>
              </div>
            )}

            {/* Mode descriptions when in Preview environment */}
            {canUsePreviewAuth && (
              loginMode === 'firebase' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center text-amber-950">
                    <AlertTriangle className="w-4 h-4 mr-1 text-amber-700 shrink-0" />
                    Chế độ Kết nối Trực tuyến:
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    Đăng nhập bằng email và mật khẩu Firebase Authentication. Firestore Rules kiểm tra quyền quản trị trên máy chủ.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center text-emerald-950">
                    <ShieldCheck className="w-4 h-4 mr-1 text-emerald-700 shrink-0" />
                    Cổng Xem Trước Giao Diện (Google AI Studio):
                  </p>
                  <p className="text-emerald-800 text-[11px]">
                    Đăng nhập nội bộ xem trước bằng mật khẩu trường học. Chế độ này sử dụng dữ liệu mẫu riêng biệt, hoàn toàn không kết nối hoặc ghi đè Cloud Firestore Production. Mật khẩu mẫu: <code className="bg-emerald-100 font-mono font-bold px-1 py-0.5 rounded text-emerald-900">Leloi@PongDrang2026#</code> (hoặc <code className="bg-emerald-100 font-mono font-bold px-1 py-0.5 rounded text-emerald-900">bgh_leloi</code>).
                  </p>
                </div>
              )
            )}

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-medium leading-relaxed">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  {loginMode === 'firebase' ? 'Email quản trị Firebase' : 'Tài khoản / Email quản trị'}
                </label>
                <input
                  type={loginMode === 'firebase' ? 'email' : 'text'}
                  required
                  placeholder={
                    loginMode === 'firebase'
                      ? 'truongthleloipongdrang@gmail.com hoặc admin email'
                      : 'truongthleloipongdrang@gmail.com hoặc bgh_leloi'
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  {loginMode === 'firebase' ? 'Mật khẩu Firebase' : 'Mật khẩu quản trị'}
                </label>
                <input
                  type="password"
                  required
                  placeholder={
                    loginMode === 'firebase'
                      ? 'Nhập mật khẩu tài khoản Firebase Authentication...'
                      : 'Nhập mật khẩu quản trị...'
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-900"
                />
              </div>

              {loginMode === 'firebase' && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseSettings(!showFirebaseSettings)}
                    className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {showFirebaseSettings
                        ? 'Ẩn cài đặt thông số Firebase'
                        : isFirebaseConfigured()
                        ? `⚙️ Đã liên kết Firebase (${getFirebaseConfig().projectId || 'Chế độ trực tuyến'})`
                        : '⚙️ Cài đặt kết nối Firebase (API Key & Project ID)'}
                    </span>
                  </button>

                  {showFirebaseSettings && (
                    <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Thông số kết nối Firebase dự án:</span>
                        {isFirebaseConfigured() ? (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Đã cấu hình
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Chưa có API Key
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                          Firebase Web API Key (VITE_FIREBASE_API_KEY)
                        </label>
                        <input
                          type="text"
                          placeholder="AIzaSy..."
                          value={fbApiKeyInput}
                          onChange={(e) => setFbApiKeyInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                          Firebase Project ID (VITE_FIREBASE_PROJECT_ID)
                        </label>
                        <input
                          type="text"
                          placeholder="vi du: th-le-loi-pongdrang"
                          value={fbProjectIdInput}
                          onChange={(e) => setFbProjectIdInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              saveFirebaseConfig({
                                apiKey: fbApiKeyInput,
                                projectId: fbProjectIdInput,
                                adminEmail: username,
                              });
                              setFbSaveMsg('Đã lưu cấu hình Firebase vào trình duyệt thành công!');
                            } catch (err: any) {
                              setFbSaveMsg(
                                err?.message ||
                                  'Cấu hình Firebase trên website Production được quản lý cố định qua biến môi trường GitHub.'
                              );
                            }
                            setTimeout(() => setFbSaveMsg(''), 5000);
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Lưu Cấu Hình Firebase
                        </button>
                        {fbSaveMsg && (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {fbSaveMsg}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        Xem chi tiết hướng dẫn tạo Web App trong tài liệu <strong>HUONG_DAN_FIREBASE.md</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {loginMode === 'school_master' && canUsePreviewAuth && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('bgh_leloi');
                      setPassword('Leloi@PongDrang2026#');
                      setLoginError('');
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Điền nhanh mật khẩu xem trước mẫu (Google AI Studio)</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-emerald-700 hover:underline font-medium cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
                <span className="text-slate-400">Phím tắt: Ctrl + K</span>
              </div>

              {showForgotNotice && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Hỗ trợ khôi phục mật khẩu:</p>
                  <p className="mt-1 leading-relaxed">
                    {loginMode === 'firebase' || !canUsePreviewAuth ? (
                      <>
                        Mật khẩu được quản lý trong Firebase Authentication. Nếu quên mật khẩu, quản trị viên có thể vào Firebase Console → Authentication → Users để đặt lại mật khẩu hoặc liên hệ email trường:{' '}
                        <strong>truongthleloipongdrang@gmail.com</strong>.
                      </>
                    ) : (
                      <>
                        Mật khẩu xem trước mẫu ban đầu trong Google AI Studio là: <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">Leloi@PongDrang2026#</code> (hoặc <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">bgh_leloi</code>).
                      </>
                    )}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className={`w-full font-bold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  loginMode === 'firebase' || !canUsePreviewAuth
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {loggingIn ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực &amp; tải dữ liệu từ Firebase...</span>
                  </>
                ) : loginMode === 'firebase' || !canUsePreviewAuth ? (
                  <>
                    <Flame className="w-4 h-4 text-amber-200" />
                    <span>Đăng Nhập Firebase Authentication</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Mở Xem Trước Giao Diện (AI Studio)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          // ================= ADMIN DASHBOARD =================
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar navigation */}
            <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
              <button
                onClick={() => setActiveTab('school')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'school'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🏫 Thông Tin Trường
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'staff'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                👨‍🏫 BGH & Giáo Viên ({draft.teachers.length})
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'news'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                📰 Tin Tức & Thông Báo ({draft.news.length})
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🎓 Học Sinh & Tra Cứu ({draft.students.length})
              </button>
              <button
                onClick={() => setActiveTab('admissions_registrations')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-between ${
                  activeTab === 'admissions_registrations'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>📋 Đăng Ký Tuyển Sinh ({admissionsList.length})</span>
                {pendingRegistrationsCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                    {pendingRegistrationsCount} mới
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-between ${
                  activeTab === 'feedback'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>💬 Ý Kiến Đóng Góp ({feedbackList.length})</span>
                {pendingFeedbackCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                    {pendingFeedbackCount} mới
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'documents'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                📂 Kho Tài Liệu ({draft.documents.length})
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'members'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                👥 Nhật Ký Thành Viên ({memberLogList.length})
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'password'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🔑 Đổi Mật Khẩu
              </button>
              <button
                onClick={() => setActiveTab('sync')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'sync'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🔄 Sao Lưu & GitHub
              </button>

              <div className="mt-auto pt-3 border-t border-slate-200 hidden md:block">
                <button
                  onClick={() => {
                    setIsPreviewSession(false);
                    setStudentBaseline(null);
                    setPassword('');
                    setLoginError('');
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  🚪 Đăng Xuất Quản Trị
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* TAB 1: SCHOOL INFO */}
              {activeTab === 'school' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                    Thông Tin Tổng Quan Nhà Trường
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Tên trường
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, name: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số điện thoại hotline
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.phone}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, phone: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email liên hệ
                      </label>
                      <input
                        type="email"
                        value={draft.schoolInfo.email}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: { ...draft.schoolInfo, email: e.target.value },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Địa chỉ đầy đủ
                      </label>
                      <input
                        type="text"
                        value={draft.schoolInfo.fullAddress}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            schoolInfo: {
                              ...draft.schoolInfo,
                              fullAddress: e.target.value,
                            },
                          })
                        }
                        className="w-full border rounded-lg p-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Khẩu hiệu giáo dục (Slogan)
                    </label>
                    <input
                      type="text"
                      value={draft.schoolInfo.slogan}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          schoolInfo: { ...draft.schoolInfo, slogan: e.target.value },
                        })
                      }
                      className="w-full border rounded-lg p-2 text-sm font-semibold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Lịch sử nhà trường
                    </label>
                    <textarea
                      rows={3}
                      value={draft.history}
                      onChange={(e) => setDraft({ ...draft, history: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sứ mệnh nhà trường
                    </label>
                    <textarea
                      rows={2}
                      value={draft.mission}
                      onChange={(e) => setDraft({ ...draft, mission: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: STAFF & BGH */}
              {activeTab === 'staff' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Ban Giám Hiệu & Đội Ngũ Giáo Viên
                    </h3>
                    <button
                      onClick={() => {
                        const newT: Teacher = {
                          id: 'teacher-' + Date.now(),
                          name: 'Giáo viên mới',
                          role: 'Giáo viên bộ môn',
                          subjectOrGrade: 'Khối 1 - Giáo viên bộ môn',
                          campus: 'Khối 1',
                          qualification: 'Cử nhân Sư phạm',
                          bio: 'Tận tâm với nghề giáo dục tiểu học tại Đắk Lắk.',
                          avatar:
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
                        };
                        setDraft({ ...draft, teachers: [newT, ...draft.teachers] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm Giáo Viên
                    </button>
                  </div>

                  {/* BGH list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase">
                      Ban Giám Hiệu (3 Đồng chí lãnh đạo)
                    </h4>
                    {draft.principals.map((p, idx) => (
                      <div
                        key={p.id}
                        className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-emerald-950">
                            {p.title}: {p.name}
                          </span>
                          <span className="text-xs text-emerald-700 font-medium">
                            {p.campus}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...draft.principals];
                            updated[idx].name = e.target.value;
                            setDraft({ ...draft, principals: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                          placeholder="Họ tên"
                        />
                        <textarea
                          rows={2}
                          value={p.bio}
                          onChange={(e) => {
                            const updated = [...draft.principals];
                            updated[idx].bio = e.target.value;
                            setDraft({ ...draft, principals: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                          placeholder="Mô tả / Tiểu sử"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Teachers list */}
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase">
                      Danh Sách Giáo Viên
                    </h4>
                    {draft.teachers.map((t, idx) => (
                      <div
                        key={t.id}
                        className="border border-slate-200 rounded-xl p-3 bg-white space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].name = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            className="font-bold text-sm text-slate-900 border rounded px-2 py-1"
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGenerateBio(idx)}
                              disabled={aiGeneratingId === t.id}
                              className="inline-flex items-center text-[11px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded"
                            >
                              <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                              {aiGeneratingId === t.id ? 'Đang tạo...' : 'AI viết mô tả'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = draft.teachers.filter(
                                  (_, i) => i !== idx
                                );
                                setDraft({ ...draft, teachers: updated });
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Xóa giáo viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <input
                            type="text"
                            value={t.role}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].role = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            placeholder="Chức vụ / Tổ"
                            className="border rounded p-1.5"
                          />
                          <input
                            type="text"
                            value={t.subjectOrGrade}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].subjectOrGrade = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            placeholder="Môn dạy / Khối (VD: Khối 1 - Lớp 1A)"
                            className="border rounded p-1.5"
                          />
                          <select
                            value={t.campus || 'Khối 1'}
                            onChange={(e) => {
                              const updated = [...draft.teachers];
                              updated[idx].campus = e.target.value;
                              setDraft({ ...draft, teachers: updated });
                            }}
                            className="border rounded p-1.5 bg-white font-medium text-emerald-800"
                          >
                            <option value="Khối 1">Khối 1</option>
                            <option value="Khối 2">Khối 2</option>
                            <option value="Khối 3">Khối 3</option>
                            <option value="Khối 4">Khối 4</option>
                            <option value="Khối 5">Khối 5</option>
                            <option value="Khối 3, 4, 5">Khối 3, 4, 5</option>
                            <option value="Toàn trường">Toàn trường</option>
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={t.bio}
                          onChange={(e) => {
                            const updated = [...draft.teachers];
                            updated[idx].bio = e.target.value;
                            setDraft({ ...draft, teachers: updated });
                          }}
                          placeholder="Mô tả tâm huyết giáo viên..."
                          className="w-full border rounded p-1.5 text-xs text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: NEWS */}
              {activeTab === 'news' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Quản Lý Tin Tức & Thông Báo
                      </h3>
                      <p className="text-xs text-slate-500">
                        Đang ghim:{' '}
                        <strong className="text-amber-800">
                          {draft.news.filter((n) => n.isFeatured).length} bài nổi bật lên Trang Chủ
                        </strong>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newN: NewsItem = {
                          id: 'news-' + Date.now(),
                          title: 'Tiêu đề tin tức mới',
                          category: 'tin-tuc',
                          categoryLabel: 'Tin Tức Nhà Trường',
                          summary: 'Tóm tắt nội dung thông báo hoặc sự kiện...',
                          content: 'Nội dung chi tiết của bài viết được cập nhật tại đây...',
                          date: new Date().toLocaleDateString('vi-VN'),
                          author: 'Ban Giám Hiệu',
                          imageUrl:
                            'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=80',
                          isFeatured: false,
                        };
                        setDraft({ ...draft, news: [newN, ...draft.news] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-800 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Viết Tin Mới
                    </button>
                  </div>

                  <div className="space-y-3">
                    {draft.news.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-3 bg-white space-y-2 transition-all ${
                          item.isFeatured
                            ? 'border-amber-400 bg-amber-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...draft.news];
                              updated[idx].title = e.target.value;
                              setDraft({ ...draft, news: updated });
                            }}
                            className="font-bold text-sm text-slate-900 border rounded px-2 py-1 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = draft.news.filter((_, i) => i !== idx);
                              setDraft({ ...draft, news: updated });
                            }}
                            className="text-red-500 hover:text-red-700 p-1 shrink-0"
                            title="Xóa bài này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={item.summary}
                          onChange={(e) => {
                            const updated = [...draft.news];
                            updated[idx].summary = e.target.value;
                            setDraft({ ...draft, news: updated });
                          }}
                          className="w-full border rounded p-1.5 text-xs text-slate-700"
                        />

                        {/* External link settings if applicable */}
                        <div className="bg-sky-50/70 border border-sky-200/80 rounded-lg p-2.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-1.5 font-bold text-sky-950 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isExternalLink || item.externalUrl)}
                                onChange={(e) => {
                                  const updated = [...draft.news];
                                  const checked = e.target.checked;
                                  updated[idx].isExternalLink = checked;
                                  if (!checked) {
                                    updated[idx].externalUrl = undefined;
                                    updated[idx].sourceName = undefined;
                                  } else {
                                    if (!updated[idx].sourceName) updated[idx].sourceName = 'Báo Đắk Lắk';
                                  }
                                  setDraft({ ...draft, news: updated });
                                }}
                                className="rounded text-sky-600 focus:ring-sky-500"
                              />
                              <span>Chia sẻ link bài báo / bài viết từ Internet</span>
                            </label>
                            {item.externalUrl && (
                              <a
                                href={item.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-700 hover:text-sky-900 font-bold text-[11px] underline flex items-center gap-1"
                              >
                                Xem bài gốc ↗
                              </a>
                            )}
                          </div>
                          {(item.isExternalLink || item.externalUrl) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-sky-950 mb-0.5">
                                  Link URL bài báo / Internet:
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://baodaklak.vn/..."
                                  value={item.externalUrl || ''}
                                  onChange={(e) => {
                                    const updated = [...draft.news];
                                    let val = e.target.value;
                                    updated[idx].externalUrl = val;
                                    updated[idx].isExternalLink = Boolean(val.trim());
                                    setDraft({ ...draft, news: updated });
                                  }}
                                  className="w-full border border-sky-300 rounded px-2 py-1 text-xs bg-white text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-sky-950 mb-0.5">
                                  Tên nguồn báo:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Báo Đắk Lắk, GD&TĐ..."
                                  value={item.sourceName || ''}
                                  onChange={(e) => {
                                    const updated = [...draft.news];
                                    updated[idx].sourceName = e.target.value;
                                    setDraft({ ...draft, news: updated });
                                  }}
                                  className="w-full border border-sky-300 rounded px-2 py-1 text-xs bg-white text-slate-900"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...draft.news];
                              updated[idx].isFeatured = !updated[idx].isFeatured;
                              setDraft({ ...draft, news: updated });
                            }}
                            className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                              item.isFeatured
                                ? 'bg-amber-500 text-slate-950 border border-amber-600 shadow-2xs hover:bg-amber-600'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 mr-1.5 ${
                                item.isFeatured
                                  ? 'fill-slate-950 text-slate-950'
                                  : 'text-slate-400'
                              }`}
                            />
                            <span>
                              {item.isFeatured
                                ? '★ Đang Ghim Nổi Bật Trang Chủ'
                                : '☆ Ghim Lên Trang Chủ'}
                            </span>
                          </button>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.date || 'Hôm nay'} • {item.categoryLabel || 'Tin Tức'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: STUDENTS */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Quản Lý Học Sinh & Dữ Liệu Tra Cứu
                      </h3>
                      <p className="text-xs text-slate-500">
                        Dữ liệu học sinh riêng tư được bảo vệ trên Firebase (chỉ quản trị viên xem được).{' '}
                        {privateStudentsLoading ? (
                          <strong className="text-amber-700">Đang tải từ Firebase...</strong>
                        ) : privateStudentsError ? (
                          <strong className="text-red-700">Chưa tải được dữ liệu từ Firebase</strong>
                        ) : (
                          <>
                            Hiện có: <strong className="text-emerald-800">{draft.students.length} học sinh</strong>.
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!isPreviewSession && (
                        <button
                          type="button"
                          disabled={privateStudentsLoading}
                          onClick={async () => {
                            try {
                              const reloaded = await onReloadPrivateStudents();
                              setStudentBaseline(structuredClone(reloaded));
                              setDraft((prev) => ({ ...prev, students: structuredClone(reloaded) }));
                              setStatusMsg({
                                type: 'success',
                                text: `Đã tải lại ${reloaded.length} hồ sơ học sinh mới nhất từ Firebase.`,
                              });
                            } catch (err: any) {
                              setStatusMsg({
                                type: 'error',
                                text: `Không thể tải lại danh sách học sinh: ${err?.message || 'Lỗi kết nối Firebase.'}`,
                              });
                            }
                          }}
                          className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
                          title="Đọc lại danh sách học sinh mới nhất từ Firebase"
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 mr-1 text-emerald-700 ${privateStudentsLoading ? 'animate-spin' : ''}`} />
                          Tải Lại Firebase
                        </button>
                      )}
                      {/* 1. Download Template */}
                      <button
                        type="button"
                        onClick={downloadStudentExcelTemplate}
                        className="inline-flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
                        title="Tải file mẫu Excel chuẩn để điền danh sách học sinh"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Tải Mẫu Excel
                      </button>

                      {/* 2. Upload Excel / CSV */}
                      <label className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Tải Lên Excel / CSV
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleStudentFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* 3. Export Excel */}
                      <button
                        type="button"
                        onClick={() => exportStudentsToExcel(draft.students)}
                        className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Xuất toàn bộ danh sách học sinh hiện tại ra file Excel (.xlsx)"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-slate-700" />
                        Xuất Excel
                      </button>

                      {/* 4. Manual Add */}
                      <button
                        type="button"
                        onClick={() => {
                          const newS: StudentRecord = {
                            id: 'std-' + Date.now(),
                            studentCode: `THLL-${100 + draft.students.length + 1}`,
                            fullName: 'Học sinh mới',
                            className: '1A',
                            campus: 'Trường chính',
                            academicYear: '2026 - 2027',
                            academicEvaluation: 'Hoàn thành tốt',
                            conductEvaluation: 'Tốt',
                            teacherName: 'Giáo viên chủ nhiệm',
                            awards: 'Chăm ngoan học tốt',
                          };
                          setDraft({ ...draft, students: [newS, ...draft.students] });
                        }}
                        className="inline-flex items-center bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Thêm Thủ Công
                      </button>
                    </div>
                  </div>

                  {/* Loading / Error Banner for Firebase Private Students */}
                  {privateStudentsLoading && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex items-center space-x-2 font-medium">
                      <RefreshCcw className="w-4 h-4 animate-spin text-amber-700 shrink-0" />
                      <span>Đang tải danh sách học sinh riêng tư từ Firebase...</span>
                    </div>
                  )}

                  {privateStudentsError && !privateStudentsLoading && (
                    <div className="bg-red-50 border border-red-200 text-red-900 text-xs p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">⚠️ Không thể tải danh sách học sinh từ Firebase</p>
                        <p className="text-red-800 mt-0.5">{privateStudentsError} (Hệ thống không tự coi danh sách là rỗng và sẽ không ghi đè dữ liệu hiện có.)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void onReloadPrivateStudents().catch(() => {});
                        }}
                        className="shrink-0 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Thử tải lại
                      </button>
                    </div>
                  )}

                  {/* Upload Error Banner */}
                  {importError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center justify-between">
                      <span>⚠️ {importError}</span>
                      <button
                        type="button"
                        onClick={() => setImportError(null)}
                        className="font-bold text-red-900 ml-2 hover:underline"
                      >
                        ✕ Đóng
                      </button>
                    </div>
                  )}

                  {/* Upload Preview & Confirmation Dialog */}
                  {importPreview && (
                    <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-200 shadow-lg">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                          <div>
                            <h4 className="font-black text-sm text-emerald-950">
                              Đã đọc file: <span className="underline decoration-emerald-500">{importPreview.fileName}</span>
                            </h4>
                            <p className="text-xs text-emerald-800">
                              Tìm thấy <strong>{importPreview.students.length} học sinh</strong> hợp lệ trong file. Vui lòng chọn cách nạp dữ liệu:
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImportPreview(null)}
                          className="text-xs text-slate-500 hover:text-slate-900 font-bold px-2 py-1 rounded bg-slate-200/60"
                        >
                          Hủy bỏ
                        </button>
                      </div>

                      {/* Mode selection radio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                            importMode === 'append'
                              ? 'bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                              : 'bg-emerald-100/40 border-emerald-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">
                              ➕ Gộp thêm vào danh sách hiện tại (Khuyên dùng - Không trùng lặp)
                            </span>
                            <span className="text-slate-600 leading-relaxed block mt-0.5">
                              Giữ nguyên {draft.students.length} học sinh đang có, tự động cập nhật hồ sơ trùng mã và chỉ thêm em mới (tổng sau gộp: <strong>{mergeStudentLists(draft.students, importPreview.students, 'append').merged.length}</strong> học sinh).
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                            importMode === 'replace'
                              ? 'bg-white border-red-500 shadow-xs ring-1 ring-red-500'
                              : 'bg-emerald-100/40 border-emerald-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="mt-0.5 text-red-600"
                          />
                          <div>
                            <span className="font-bold text-red-900 block">
                              🔄 Ghi đè thay thế toàn bộ danh sách
                            </span>
                            <span className="text-slate-600 leading-relaxed block mt-0.5">
                              Xóa toàn bộ danh sách cũ ({draft.students.length} em) và nạp mới {importPreview.students.length} học sinh từ file này.
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Table preview (first 5) */}
                      <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                        <div className="bg-emerald-100/70 px-3 py-1.5 text-[11px] font-bold text-emerald-950 flex justify-between items-center">
                          <span>Xem trước dữ liệu trích xuất (5 dòng đầu tiên):</span>
                          <span className="text-xs bg-emerald-200/80 px-2 py-0.5 rounded-full">
                            5 / {importPreview.students.length} học sinh
                          </span>
                        </div>
                        <div className="overflow-x-auto max-h-40">
                          <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                              <tr>
                                <th className="px-2.5 py-1.5 text-left">Mã HS</th>
                                <th className="px-2.5 py-1.5 text-left">Họ và Tên</th>
                                <th className="px-2.5 py-1.5 text-left">Lớp</th>
                                <th className="px-2.5 py-1.5 text-left">Điểm Trường</th>
                                <th className="px-2.5 py-1.5 text-left">Đánh Giá Học Tập</th>
                                <th className="px-2.5 py-1.5 text-left">Đánh Giá Rèn Luyện</th>
                                <th className="px-2.5 py-1.5 text-left">GVCN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importPreview.students.slice(0, 5).map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 font-mono font-bold text-emerald-800">
                                    {s.studentCode}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-900">
                                    {s.fullName}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-bold text-slate-700">
                                    {s.className}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-medium text-emerald-800">
                                    {s.campus || 'Trường chính'}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-emerald-700 font-medium">
                                    {s.academicEvaluation}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-600">
                                    {s.conductEvaluation}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-600">
                                    {s.teacherName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Confirm / Cancel buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setImportPreview(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                        >
                          Hủy Bỏ
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmStudentImport}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Xác Nhận Nạp {importPreview.students.length} Học Sinh Vào Danh Sách
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Mã HS</th>
                          <th className="px-3 py-2 text-left">Họ và Tên</th>
                          <th className="px-3 py-2 text-left">Lớp</th>
                          <th className="px-3 py-2 text-left">Điểm Trường</th>
                          <th className="px-3 py-2 text-left">Đánh Giá Học Tập</th>
                          <th className="px-3 py-2 text-left">GVCN</th>
                          <th className="px-3 py-2 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {draft.students.map((st, idx) => (
                          <tr key={st.id}>
                            <td className="px-3 py-2 font-mono font-bold text-emerald-800">
                              <input
                                type="text"
                                value={st.studentCode}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].studentCode = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-20 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.fullName}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].fullName = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-36 border rounded px-1 py-0.5 font-semibold"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.className}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].className = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-16 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={st.campus || 'Trường chính'}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].campus = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="border rounded px-2 py-0.5 text-xs bg-white text-emerald-900 font-semibold"
                              >
                                <option value="Trường chính">Trường chính</option>
                                <option value="Phân hiệu 1">Phân hiệu 1</option>
                                <option value="Phân hiệu 2">Phân hiệu 2</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={st.academicEvaluation}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].academicEvaluation = e.target.value as any;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="border rounded px-1 py-0.5"
                              >
                                <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                                <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Cần cố gắng">Cần cố gắng</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={st.teacherName}
                                onChange={(e) => {
                                  const upd = [...draft.students];
                                  upd[idx].teacherName = e.target.value;
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="w-32 border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  const upd = draft.students.filter((_, i) => i !== idx);
                                  setDraft({ ...draft, students: upd });
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* A. Safe Backup & Migration to studentResults/{studentId} */}
                  {!isPreviewSession && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            <span>Sao Lưu &amp; Đồng Bộ Cho Cổng Phụ Huynh (studentResults)</span>
                          </h4>
                          <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                            Sao chép an toàn {draft.students.length} hồ sơ học sinh sang collection <code className="bg-white px-1 rounded">studentResults/{'{studentId}'}</code> (ID chuẩn theo Mã HS, không trùng lặp) để phụ huynh chỉ đọc đúng kết quả con em mình. Tuyệt đối không xóa hay ghi đè dữ liệu gốc <code className="bg-white px-1 rounded">siteData/privateStudents</code>.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleBackupStudentsJson}
                            className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                            <span>Sao Lưu JSON ({draft.students.length} em)</span>
                          </button>
                          <button
                            type="button"
                            disabled={migratingResults || draft.students.length === 0}
                            onClick={handleSyncToStudentResults}
                            className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs disabled:opacity-60 cursor-pointer"
                          >
                            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${migratingResults ? 'animate-spin' : ''}`} />
                            <span>
                              {migratingResults
                                ? 'Đang đồng bộ sang studentResults...'
                                : `Đồng Bộ ${draft.students.length} HS Sang studentResults`}
                            </span>
                          </button>
                        </div>
                      </div>

                      {migrationReportMsg && (
                        <div
                          className={`text-xs p-2.5 rounded-xl border font-semibold ${
                            migrationReportMsg.type === 'success'
                              ? 'bg-white border-emerald-300 text-emerald-900'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          {migrationReportMsg.text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* B. Parent Account Linking Panel (parentLinks/{parentUid}) */}
                  {!isPreviewSession && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                            <span>Liên Kết Tài Khoản Phụ Huynh – Học Sinh (parentLinks)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Nhập UID và Email của tài khoản phụ huynh (tạo tại Firebase Console → Authentication → Users) rồi chọn 1 hoặc nhiều học sinh là con em của phụ huynh đó.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={loadingParentLinks}
                          onClick={() => {
                            setLoadingParentLinks(true);
                            fetchParentLinksForAdmin()
                              .then((list) => setParentLinks(list))
                              .catch((err: any) =>
                                setParentLinkMsg({
                                  type: 'error',
                                  text: err?.message || 'Không tải được danh sách liên kết.',
                                })
                              )
                              .finally(() => setLoadingParentLinks(false));
                          }}
                          className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-lg text-xs cursor-pointer self-start sm:self-auto"
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${loadingParentLinks ? 'animate-spin' : ''}`} />
                          <span>Tải Lại ({parentLinks.length})</span>
                        </button>
                      </div>

                      {parentLinkMsg && (
                        <div
                          className={`text-xs p-2.5 rounded-xl border font-semibold ${
                            parentLinkMsg.type === 'success'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          {parentLinkMsg.text}
                        </div>
                      )}

                      <form onSubmit={handleSaveParentLink} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              UID Tài khoản Phụ huynh *
                            </label>
                            <input
                              type="text"
                              required
                              value={parentLinkUidInput}
                              onChange={(e) => setParentLinkUidInput(e.target.value)}
                              placeholder="Dán User UID từ Firebase Auth"
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Email Phụ huynh *
                            </label>
                            <input
                              type="email"
                              required
                              value={parentLinkEmailInput}
                              onChange={(e) => setParentLinkEmailInput(e.target.value)}
                              placeholder="phuhuynh@gmail.com"
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Tên Phụ huynh (tùy chọn)
                            </label>
                            <input
                              type="text"
                              value={parentLinkNameInput}
                              onChange={(e) => setParentLinkNameInput(e.target.value)}
                              placeholder="Ví dụ: Phụ huynh em Nguyễn Văn A"
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Chọn học sinh liên kết (có thể chọn nhiều con em): ({selectedStudentIdsForParent.length} đã chọn)
                          </label>
                          <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-xs">
                            {draft.students.map((st) => {
                              const sid = toSafeStudentResultDocId(st);
                              const checked = selectedStudentIdsForParent.includes(sid);
                              return (
                                <label
                                  key={st.id}
                                  className={`flex items-center space-x-2 p-1.5 rounded-lg border cursor-pointer ${
                                    checked
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudentIdsForParent((prev) => [...prev, sid]);
                                      } else {
                                        setSelectedStudentIdsForParent((prev) =>
                                          prev.filter((id) => id !== sid)
                                        );
                                      }
                                    }}
                                    className="rounded text-emerald-700"
                                  />
                                  <span className="truncate">
                                    <span className="font-mono text-emerald-800">{st.studentCode}</span> – {st.fullName} ({st.className})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingParentLink}
                            className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-xs disabled:opacity-60 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            <span>{savingParentLink ? 'Đang lưu...' : 'Lưu Liên Kết Phụ Huynh'}</span>
                          </button>
                        </div>
                      </form>

                      {parentLinks.length > 0 && (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                              <tr>
                                <th className="px-3 py-2 text-left">Email &amp; Tên Phụ Huynh</th>
                                <th className="px-3 py-2 text-left">UID</th>
                                <th className="px-3 py-2 text-left">Học Sinh Liên Kết</th>
                                <th className="px-3 py-2 text-right">Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {parentLinks.map((pl) => (
                                <tr key={pl.parentUid}>
                                  <td className="px-3 py-2">
                                    <div className="font-bold text-slate-900">{pl.parentEmail}</div>
                                    {pl.parentName && (
                                      <div className="text-[11px] text-slate-500">{pl.parentName}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                                    {pl.parentUid}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1">
                                      {(pl.studentCodes.length > 0 ? pl.studentCodes : pl.studentIds).map((code) => (
                                        <span
                                          key={code}
                                          className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded"
                                        >
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setParentLinkUidInput(pl.parentUid);
                                        setParentLinkEmailInput(pl.parentEmail);
                                        setParentLinkNameInput(pl.parentName || '');
                                        setSelectedStudentIdsForParent(pl.studentIds);
                                      }}
                                      className="text-emerald-700 hover:underline font-bold cursor-pointer"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteParentLink(pl.parentUid)}
                                      className="text-red-600 hover:underline font-bold cursor-pointer"
                                    >
                                      Gỡ
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Kho Tài Liệu Học Liệu Số
                      </h3>
                      <p className="text-xs text-slate-500">
                        Quản lý văn bản, giáo án, đề thi và gắn đường link Google Drive, OneDrive, PDF trực tuyến để xem/tải về.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newDoc: DocumentItem = {
                          id: 'doc-' + Date.now(),
                          title: 'Tài liệu giáo dục mới',
                          category: 'giao-an',
                          categoryLabel: 'Giáo Án & Phân Phối',
                          fileSize: '1.5 MB',
                          fileType: 'PDF / DOCX',
                          uploadDate: new Date().toLocaleDateString('vi-VN'),
                          uploaderName: 'Ban Quản Trị',
                          uploaderEmail: 'truongthleloipongdrang@gmail.com',
                          downloadCount: 0,
                          description: 'Mô tả tóm tắt nội dung tài liệu học tập...',
                          downloadUrl: '',
                        };
                        setDraft({ ...draft, documents: [newDoc, ...draft.documents] });
                      }}
                      className="inline-flex items-center bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm Tài Liệu Mới
                    </button>
                  </div>

                  {/* Pending Member Document Submissions Moderation Queue */}
                  {!isPreviewSession && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                        <div>
                          <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-700" />
                            <span>
                              Học Liệu Thành Viên Gửi Chờ Kiểm Duyệt ({docSubmissions.filter((s) => s.status === 'pending').length} chờ duyệt / {docSubmissions.length} tổng)
                            </span>
                          </h4>
                          <p className="text-[11px] text-amber-900/90 mt-0.5">
                            Thành viên gửi link học liệu sẽ vào hàng chờ tại đây. Chỉ Quản trị viên mới có quyền duyệt để xuất bản công khai.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={loadingDocSubmissions}
                          onClick={() => {
                            setLoadingDocSubmissions(true);
                            fetchDocumentSubmissionsForAdmin()
                              .then((list) => setDocSubmissions(list))
                              .catch((err: any) =>
                                setDocSubMsg({
                                  type: 'error',
                                  text: err?.message || 'Không tải được hàng chờ học liệu.',
                                })
                              )
                              .finally(() => setLoadingDocSubmissions(false));
                          }}
                          className="inline-flex items-center bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2.5 py-1.5 rounded-lg text-xs cursor-pointer self-start sm:self-auto"
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${loadingDocSubmissions ? 'animate-spin' : ''}`} />
                          <span>Tải Lại Hàng Chờ</span>
                        </button>
                      </div>

                      {docSubMsg && (
                        <div
                          className={`text-xs p-2.5 rounded-xl border font-semibold ${
                            docSubMsg.type === 'success'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          {docSubMsg.text}
                        </div>
                      )}

                      {docSubmissions.length === 0 ? (
                        <p className="text-xs text-amber-900/80 italic">
                          Chưa có đề xuất học liệu nào từ thành viên.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {docSubmissions.map((sub) => {
                            const urlInfo = validateDocumentUrl(sub.downloadUrl);
                            return (
                              <div
                                key={sub.id}
                                className="bg-white border border-amber-200 rounded-xl p-3 space-y-2 text-xs"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <span className="font-extrabold text-slate-900">{sub.title}</span>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      Gửi bởi: <strong>{sub.submittedByName}</strong> ({sub.submittedByEmail}) • {sub.categoryLabel} • {sub.fileType}
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      sub.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sub.status === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {sub.status === 'approved'
                                      ? 'Đã duyệt'
                                      : sub.status === 'rejected'
                                      ? 'Đã từ chối'
                                      : 'Chờ duyệt'}
                                  </span>
                                </div>

                                <p className="text-slate-700">{sub.description}</p>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                  {urlInfo.valid && urlInfo.normalizedUrl ? (
                                    <a
                                      href={urlInfo.normalizedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono text-[11px] truncate max-w-md"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{urlInfo.normalizedUrl}</span>
                                    </a>
                                  ) : (
                                    <span className="text-red-600 font-bold text-[11px]">
                                      Liên kết không hợp lệ ({urlInfo.error})
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1.5">
                                    {sub.status === 'pending' && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={processingSubId === sub.id || !urlInfo.valid}
                                          onClick={() => handleApproveSubmission(sub)}
                                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50 cursor-pointer"
                                        >
                                          Duyệt &amp; Xuất Bản
                                        </button>
                                        <button
                                          type="button"
                                          disabled={processingSubId === sub.id}
                                          onClick={() => handleRejectSubmission(sub)}
                                          className="bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50 cursor-pointer"
                                        >
                                          Từ Chối
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      disabled={processingSubId === sub.id}
                                      onClick={() => handleDeleteSubmission(sub.id)}
                                      className="text-red-600 hover:bg-red-50 font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {draft.documents.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className="border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 bg-white shadow-2xs space-y-3 transition-colors"
                      >
                        {/* Title and Delete button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase">
                              Tiêu đề tài liệu #{idx + 1}
                            </label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].title = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Nhập tên tiêu đề tài liệu..."
                              className="font-bold text-sm text-slate-900 border border-slate-300 focus:border-emerald-600 rounded-lg px-2.5 py-1.5 w-full bg-slate-50/50 focus:bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const upd = draft.documents.filter((_, i) => i !== idx);
                              setDraft({ ...draft, documents: upd });
                            }}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors mt-4"
                            title="Xóa tài liệu này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* LINK INPUT BOX */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                          <label className="flex items-center text-xs font-bold text-emerald-900">
                            <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-700 shrink-0" />
                            <span>Đường link dẫn tới tài liệu (Google Drive, OneDrive, PDF, Docs, Dropbox...):</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={doc.downloadUrl === '#' ? '' : doc.downloadUrl}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].downloadUrl = e.target.value.trim();
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Dán link Google Drive, OneDrive, PDF hoặc link tải tại đây (https://drive.google.com/...)"
                              className="flex-1 border border-emerald-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 bg-white"
                            />
                            {(() => {
                              const check = validateDocumentUrl(doc.downloadUrl);
                              if (!check.valid || !check.normalizedUrl) return null;
                              return (
                                <a
                                  href={check.normalizedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs"
                                  title="Mở kiểm tra đường link này trong tab mới"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Mở xem thử</span>
                                </a>
                              );
                            })()}
                          </div>
                          <p className="text-[11px] text-emerald-800/80">
                            * Khi dán link Google Drive, hãy đảm bảo đã bật quyền <em>&quot;Bất kỳ ai có đường liên kết đều có thể xem&quot;</em> để thầy cô, phụ huynh và học sinh mở được.
                          </p>
                        </div>

                        {/* Category & Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Chuyên mục
                            </label>
                            <select
                              value={doc.category}
                              onChange={(e) => {
                                const catMap: Record<string, string> = {
                                  'giao-an': 'Giáo Án & Phân Phối',
                                  'de-thi': 'Đề Thi & Đáp Án',
                                  'van-ban': 'Thông Tư & Văn Bản',
                                  'tap-huan': 'Tài Liệu Tập Huấn',
                                  stem: 'Bài Giảng STEM',
                                  'hoc-sinh': 'Học Sinh Ôn Luyện',
                                  'chuyen-de': 'Chuyên Đề Bồi Dưỡng',
                                  'ke-hoach': 'Kế Hoạch Giáo Dục',
                                };
                                const val = e.target.value as any;
                                const upd = [...draft.documents];
                                upd[idx].category = val;
                                upd[idx].categoryLabel = catMap[val] || 'Tài Liệu Học Tập';
                                setDraft({ ...draft, documents: upd });
                              }}
                              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-800"
                            >
                              <option value="giao-an">Giáo Án & Phân Phối</option>
                              <option value="de-thi">Đề Thi & Đáp Án</option>
                              <option value="van-ban">Thông Tư & Văn Bản</option>
                              <option value="tap-huan">Tài Liệu Tập Huấn</option>
                              <option value="stem">Bài Giảng STEM</option>
                              <option value="hoc-sinh">Học Sinh Ôn Luyện</option>
                              <option value="chuyen-de">Chuyên Đề Bồi Dưỡng</option>
                              <option value="ke-hoach">Kế Hoạch Giáo Dục</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Định dạng file
                            </label>
                            <input
                              type="text"
                              value={doc.fileType}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].fileType = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="PDF, DOCX, ZIP..."
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Dung lượng
                            </label>
                            <input
                              type="text"
                              value={doc.fileSize}
                              onChange={(e) => {
                                const upd = [...draft.documents];
                                upd[idx].fileSize = e.target.value;
                                setDraft({ ...draft, documents: upd });
                              }}
                              placeholder="Ví dụ: 2.4 MB"
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Mô tả tóm tắt tài liệu
                          </label>
                          <textarea
                            rows={2}
                            value={doc.description}
                            onChange={(e) => {
                              const upd = [...draft.documents];
                              upd[idx].description = e.target.value;
                              setDraft({ ...draft, documents: upd });
                            }}
                            placeholder="Mô tả nội dung tóm tắt để người xem nắm rõ trước khi tải..."
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
                          />
                        </div>

                        {/* Footer info */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>
                            Người đăng: <strong>{doc.uploaderName}</strong> ({doc.uploaderEmail})
                          </span>
                          <span className="text-emerald-700 font-semibold">
                            Lượt tải: {doc.downloadCount} lượt
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: MEMBERS LOG */}
              {activeTab === 'members' && (() => {
                const combinedMembers: MemberUser[] = [];
                const seenEmails = new Set<string>();
                for (const m of [...remoteMembers, ...memberLogList]) {
                  const key = (m.email || m.id).toLowerCase();
                  if (!seenEmails.has(key)) {
                    seenEmails.add(key);
                    combinedMembers.push(m);
                  }
                }
                return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Nhật Ký &amp; Trích Xuất Thành Viên Google ({combinedMembers.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Danh sách thành viên đã xác thực Google qua Firebase Authentication (memberProfiles).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPreviewSession && (
                        <button
                          type="button"
                          disabled={loadingRemoteMembers}
                          onClick={() => {
                            setLoadingRemoteMembers(true);
                            fetchMemberProfilesForAdmin()
                              .then((list) => setRemoteMembers(list))
                              .catch(() => {})
                              .finally(() => setLoadingRemoteMembers(false));
                          }}
                          className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${loadingRemoteMembers ? 'animate-spin' : ''}`} />
                          Tải Từ Firebase
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={exportMembersCsv}
                        className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Trích Xuất Danh Sách (CSV)
                      </button>
                    </div>
                  </div>

                  {combinedMembers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có thành viên Google nào được ghi nhận trên Firebase.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 font-bold uppercase text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Gmail / Email</th>
                            <th className="px-3 py-2 text-left">Họ và Tên</th>
                            <th className="px-3 py-2 text-left">Vai Trò</th>
                            <th className="px-3 py-2 text-left">Đăng Nhập Gần Nhất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {combinedMembers.map((m) => (
                            <tr key={m.id}>
                              <td className="px-3 py-2 font-semibold text-emerald-800">
                                {m.email}
                              </td>
                              <td className="px-3 py-2 text-slate-900">{m.name}</td>
                              <td className="px-3 py-2 text-slate-600">
                                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                                  {m.role}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{m.loginAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* TAB 7: CHANGE PASSWORD */}
              {activeTab === 'password' && (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Đổi Mật Khẩu Quản Trị
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isOnlineAuthenticated()
                        ? 'Tài khoản quản trị đang được bảo vệ bởi Firebase Authentication.'
                        : 'Thay đổi mật khẩu quản trị xem trước trên Google AI Studio.'}
                    </p>
                  </div>

                  {isOnlineAuthenticated() ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
                      <p className="font-bold flex items-center gap-1.5 text-amber-950">
                        <Flame className="w-4 h-4 text-amber-600" />
                        Quản lý mật khẩu qua Firebase Authentication
                      </p>
                      <p className="leading-relaxed">
                        Tài khoản quản trị <strong>{getOnlineSession()?.email || 'truongthleloipongdrang@gmail.com'}</strong> được quản lý tập trung và bảo vệ trên hệ thống máy chủ Google Firebase.
                      </p>
                      <p className="leading-relaxed text-slate-600">
                        Để đổi hoặc đặt lại mật khẩu:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                        <li>Truy cập <strong>Firebase Console</strong> → Chọn dự án của trường.</li>
                        <li>Vào mục <strong>Authentication</strong> → Thẻ <strong>Users</strong>.</li>
                        <li>Tìm tài khoản email quản trị → Nhấp biểu tượng 3 chấm (⋮) → Chọn <strong>Reset password</strong>.</li>
                      </ol>
                    </div>
                  ) : (
                    <>
                      {pwMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900">
                          {pwMsg}
                        </div>
                      )}

                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Mật khẩu hiện tại
                          </label>
                          <input
                            type="password"
                            required
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Mật khẩu mới (tối thiểu 8 ký tự)
                          </label>
                          <input
                            type="password"
                            required
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Xác nhận mật khẩu mới
                          </label>
                          <input
                            type="password"
                            required
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Cập Nhật Mật Khẩu Xem Trước
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* TAB: ADMISSIONS REGISTRATIONS */}
              {activeTab === 'admissions_registrations' && (
                <div className="space-y-6">
                  {/* Top heading & Export Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        HỆ THỐNG TIẾP NHẬN TUYỂN SINH LỚP 1
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                        Danh Sách Phụ Huynh Đăng Ký Tư Vấn
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng hợp toàn bộ thông tin đăng ký tư vấn trực tuyến cho con em tại Trường chính và 2 Phân hiệu.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportRegistrationsToExcel(filteredAdmissions)}
                        className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                        title="Tải danh sách tuyển sinh dạng file Excel .xlsx"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        <span>Tải Danh Sách Tổng Hợp (Excel)</span>
                      </button>
                      <button
                        onClick={() => exportRegistrationsToCsv(filteredAdmissions)}
                        className="inline-flex items-center bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 font-semibold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        title="Tải danh sách tuyển sinh dạng file CSV"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span>Xuất CSV</span>
                      </button>
                      <button
                        type="button"
                        disabled={syncingAdmissions}
                        onClick={async () => {
                          setSyncingAdmissions(true);
                          try {
                            if (isPreviewSession || isTrustedPreviewEnvironment()) {
                              setAdmissionsList([...MOCK_PREVIEW_ADMISSIONS]);
                              return;
                            }
                            const list = await syncAdmissionsWithFirestore(false);
                            setAdmissionsList(list);
                          } finally {
                            setSyncingAdmissions(false);
                          }
                        }}
                        className="inline-flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Đồng bộ hồ sơ trực tiếp từ Cloud Firestore"
                      >
                        <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${syncingAdmissions ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{syncingAdmissions ? 'Đang đồng bộ...' : 'Đồng bộ Cloud Firestore'}</span>
                      </button>
                      {/* Nút xoá tất cả danh sách khi đã tuyển sinh xong */}
                      {confirmClearAllAdmissions ? (
                        <div className="inline-flex items-center gap-1.5 bg-red-100 border border-red-300 p-1 rounded-xl animate-in fade-in">
                          <span className="text-[11px] font-bold text-red-900 px-1.5">Xóa sạch danh sách?</span>
                          <button
                            type="button"
                            onClick={handleClearAllAdmissionRegs}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-all"
                          >
                            Đồng ý
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearAllAdmissions(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllAdmissions(true)}
                          disabled={admissionsList.length === 0}
                          className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xoá tất cả danh sách khi đã tuyển sinh xong"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5 text-red-600" />
                          <span>Xóa Tất Cả Danh Sách (Đã Tuyển Sinh Xong)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-500">TỔNG HỒ SƠ ĐĂNG KÝ</span>
                        <div className="text-2xl font-black text-slate-900 mt-0.5">{admissionsList.length}</div>
                        <span className="text-[11px] text-slate-500">Lượt phụ huynh gửi thông tin</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center font-bold">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-amber-700">CHỜ LIÊN HỆ (MỚI)</span>
                        <div className="text-2xl font-black text-amber-900 mt-0.5">{pendingRegistrationsCount}</div>
                        <span className="text-[11px] text-amber-700 font-medium">Cần gọi điện tư vấn chu đáo</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold">
                        <Phone className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-emerald-700">ĐÃ TƯ VẤN THÀNH CÔNG</span>
                        <div className="text-2xl font-black text-emerald-900 mt-0.5">
                          {admissionsList.length - pendingRegistrationsCount}
                        </div>
                        <span className="text-[11px] text-emerald-700 font-medium">Đã liên hệ hướng dẫn phụ huynh</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regSearchQuery}
                        onChange={(e) => setRegSearchQuery(e.target.value)}
                        placeholder="Tìm theo họ tên phụ huynh, học sinh hoặc số điện thoại..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={regCampusFilter}
                        onChange={(e) => setRegCampusFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        <option value="all">Tất cả điểm trường</option>
                        <option value="Trường chính">Trường chính (Thôn Ea Tút)</option>
                        <option value="Phân hiệu 1">Phân hiệu 1</option>
                        <option value="Phân hiệu 2">Phân hiệu 2</option>
                      </select>

                      <select
                        value={regStatusFilter}
                        onChange={(e) => setRegStatusFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Chưa liên hệ ({pendingRegistrationsCount})</option>
                        <option value="contacted">Đã liên hệ ({admissionsList.length - pendingRegistrationsCount})</option>
                      </select>
                    </div>
                  </div>

                  {/* Table of Registrations */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">STT</th>
                            <th className="py-3 px-3">Thời Gian</th>
                            <th className="py-3 px-3">Phụ Huynh & SĐT</th>
                            <th className="py-3 px-3">Học Sinh & Điểm Trường</th>
                            <th className="py-3 px-3">Ghi Chú / Câu Hỏi</th>
                            <th className="py-3 px-3 text-center">Trạng Thái</th>
                            <th className="py-3 px-3 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredAdmissions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">
                                <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                <p className="font-semibold text-slate-700">Chưa tìm thấy đăng ký tuyển sinh nào</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Khi phụ huynh gửi thông tin tại trang Tuyển Sinh, danh sách sẽ tự động hiển thị ở đây.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredAdmissions.map((reg, index) => (
                              <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                                  {index + 1}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                  {reg.submittedAt}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-900">{reg.parentName}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <a
                                      href={`tel:${reg.phone}`}
                                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                                      title="Bấm để gọi điện"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      <span>{reg.phone}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(reg.phone);
                                        setCopiedPhoneId(reg.id);
                                        setTimeout(() => setCopiedPhoneId(null), 2000);
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      title="Sao chép số điện thoại"
                                    >
                                      {copiedPhoneId === reg.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-emerald-950">
                                    {reg.childName} <span className="font-normal text-slate-500">({reg.birthYear})</span>
                                  </div>
                                  <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {reg.campusChoice}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-600 max-w-xs text-xs">
                                  <p className="line-clamp-2" title={reg.note}>{reg.note}</p>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <button
                                    onClick={() =>
                                      updateRegistrationStatus(
                                        reg.id,
                                        reg.status === 'contacted' ? 'pending' : 'contacted'
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                      reg.status === 'contacted'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                                    }`}
                                    title="Bấm để đổi trạng thái xử lý"
                                  >
                                    {reg.status === 'contacted' ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                        <span>Đã liên hệ</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 text-amber-700" />
                                        <span>Chưa liên hệ</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  {confirmDeleteRegId === reg.id ? (
                                    <div className="flex items-center justify-end gap-1 animate-in fade-in">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAdmissionReg(reg.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-xs cursor-pointer transition-all"
                                        title="Xác nhận xóa bản đăng ký này"
                                      >
                                        Xác nhận xóa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteRegId(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-1 rounded text-[10px] cursor-pointer transition-all"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRegId(reg.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      title="Xóa bản đăng ký"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FEEDBACK & CONTACTS (Ý Kiến Đóng Góp / Phản Ánh & Trao Đổi) */}
              {activeTab === 'feedback' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Hộp Thư Ý Kiến Đóng Góp & Trao Đổi</span>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          {feedbackList.length} ý kiến
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng hợp ý kiến, phản ánh và tâm tư của phụ huynh, nhân dân gửi đến Ban Giám hiệu qua website.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportFeedbackToExcel(filteredFeedback)}
                        className="inline-flex items-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                        title="Tải danh sách ý kiến dạng file Excel .xlsx"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        <span>Tải Excel Ý Kiến</span>
                      </button>
                      <button
                        onClick={() => exportFeedbackToCsv(filteredFeedback)}
                        className="inline-flex items-center bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 font-semibold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        title="Tải danh sách ý kiến dạng file CSV"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span>Xuất CSV</span>
                      </button>
                      <button
                        type="button"
                        disabled={syncingFeedback}
                        onClick={async () => {
                          setSyncingFeedback(true);
                          try {
                            if (isPreviewSession || isTrustedPreviewEnvironment()) {
                              setFeedbackList([...MOCK_PREVIEW_FEEDBACK]);
                              return;
                            }
                            const list = await syncFeedbackWithFirestore(false);
                            setFeedbackList(list);
                          } finally {
                            setSyncingFeedback(false);
                          }
                        }}
                        className="inline-flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Đồng bộ hộp thư ý kiến trực tiếp từ Cloud Firestore"
                      >
                        <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${syncingFeedback ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{syncingFeedback ? 'Đang đồng bộ...' : 'Đồng bộ Cloud Firestore'}</span>
                      </button>

                      {/* Nút xoá tất cả danh sách */}
                      {confirmClearAllFeedback ? (
                        <div className="inline-flex items-center gap-1.5 bg-red-100 border border-red-300 p-1 rounded-xl animate-in fade-in">
                          <span className="text-[11px] font-bold text-red-900 px-1.5">Xóa sạch hộp thư?</span>
                          <button
                            type="button"
                            onClick={handleClearAllFeedbackItems}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-all"
                          >
                            Đồng ý
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearAllFeedback(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllFeedback(true)}
                          disabled={feedbackList.length === 0}
                          className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xóa toàn bộ danh sách ý kiến đóng góp"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5 text-red-600" />
                          <span>Xóa Tất Cả Hộp Thư</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-500">TỔNG Ý KIẾN ĐÃ NHẬN</span>
                        <div className="text-2xl font-black text-slate-900 mt-0.5">{feedbackList.length}</div>
                        <span className="text-[11px] text-slate-500">Lượt phụ huynh & nhân dân gửi</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center font-bold">
                        <MessageSquareText className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-amber-700">CHỜ PHẢN HỒI (MỚI)</span>
                        <div className="text-2xl font-black text-amber-900 mt-0.5">{pendingFeedbackCount}</div>
                        <span className="text-[11px] text-amber-700 font-medium">Cần Ban Giám hiệu xem xét</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-emerald-700">ĐÃ TIẾP THU & XỬ LÝ</span>
                        <div className="text-2xl font-black text-emerald-900 mt-0.5">
                          {feedbackList.length - pendingFeedbackCount}
                        </div>
                        <span className="text-[11px] text-emerald-700 font-medium">Đã giải đáp / xử lý chu đáo</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={feedbackSearchQuery}
                        onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                        placeholder="Tìm theo họ tên, số điện thoại, email hoặc nội dung ý kiến..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={feedbackStatusFilter}
                        onChange={(e) => setFeedbackStatusFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Chờ phản hồi ({pendingFeedbackCount})</option>
                        <option value="resolved">Đã tiếp thu & xử lý ({feedbackList.length - pendingFeedbackCount})</option>
                      </select>
                    </div>
                  </div>

                  {/* Table of Feedbacks */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">STT</th>
                            <th className="py-3 px-3 whitespace-nowrap">Thời Gian</th>
                            <th className="py-3 px-3">Người Gửi & Liên Hệ</th>
                            <th className="py-3 px-4 min-w-[320px]">Nội Dung Ý Kiến Đóng Góp / Trao Đổi</th>
                            <th className="py-3 px-3 text-center">Trạng Thái</th>
                            <th className="py-3 px-3 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredFeedback.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-500">
                                <MessageSquareText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                <p className="font-semibold text-slate-700">Chưa có ý kiến đóng góp nào</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Khi phụ huynh hoặc nhân dân điền biểu mẫu "Gửi Ý Kiến Đóng Góp / Phản Ánh", nội dung trao đổi sẽ hiển thị đầy đủ tại đây.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredFeedback.map((fb, index) => (
                              <tr key={fb.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                                  {index + 1}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                  {fb.submittedAt}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="font-bold text-slate-900">{fb.fullName}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <a
                                      href={`tel:${fb.phone}`}
                                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 font-mono text-[11px]"
                                      title="Bấm để gọi điện"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      <span>{fb.phone}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(fb.phone);
                                        setCopiedFeedbackPhoneId(fb.id);
                                        setTimeout(() => setCopiedFeedbackPhoneId(null), 2000);
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      title="Sao chép số điện thoại"
                                    >
                                      {copiedFeedbackPhoneId === fb.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  {fb.email && (
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      <span>{fb.email}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-800 leading-relaxed text-xs">
                                    <p className="whitespace-pre-line select-text font-normal">{fb.message}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <button
                                    onClick={() =>
                                      updateFeedbackStatus(
                                        fb.id,
                                        fb.status === 'resolved' ? 'pending' : 'resolved'
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                      fb.status === 'resolved'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                                    }`}
                                    title="Bấm để đổi trạng thái xử lý"
                                  >
                                    {fb.status === 'resolved' ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                        <span>Đã tiếp thu / xử lý</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 text-amber-700" />
                                        <span>Chờ phản hồi</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  {confirmDeleteFeedbackId === fb.id ? (
                                    <div className="flex items-center justify-end gap-1 animate-in fade-in">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFeedbackItem(fb.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-xs cursor-pointer transition-all"
                                        title="Xác nhận xóa ý kiến này"
                                      >
                                        Xác nhận xóa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteFeedbackId(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-1 rounded text-[10px] cursor-pointer transition-all"
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setViewingFeedbackDetail(fb)}
                                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                        title="Xem chi tiết nội dung trao đổi"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteFeedbackId(fb.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                        title="Xóa ý kiến này"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detail Popover / Modal for reading long messages */}
                  {viewingFeedbackDetail && (
                    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b pb-3">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              NỘI DUNG LIÊN HỆ / TRAO ĐỔI
                            </span>
                            <h4 className="text-base font-bold text-slate-900 mt-1">
                              Ý kiến của: {viewingFeedbackDetail.fullName}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingFeedbackDetail(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px]">SỐ ĐIỆN THOẠI</span>
                              <a
                                href={`tel:${viewingFeedbackDetail.phone}`}
                                className="font-bold text-emerald-800 font-mono hover:underline"
                              >
                                {viewingFeedbackDetail.phone}
                              </a>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">THỜI GIAN GỬI</span>
                              <span className="font-medium text-slate-700 font-mono">
                                {viewingFeedbackDetail.submittedAt}
                              </span>
                            </div>
                            {viewingFeedbackDetail.email && (
                              <div className="col-span-2">
                                <span className="text-slate-400 block text-[10px]">EMAIL</span>
                                <span className="text-slate-700 font-medium">{viewingFeedbackDetail.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-500 font-bold text-[11px] block">
                              Toàn văn nội dung trao đổi:
                            </span>
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                              {viewingFeedbackDetail.message}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <button
                            type="button"
                            onClick={() => {
                              updateFeedbackStatus(
                                viewingFeedbackDetail.id,
                                viewingFeedbackDetail.status === 'resolved' ? 'pending' : 'resolved'
                              );
                              setViewingFeedbackDetail({
                                ...viewingFeedbackDetail,
                                status: viewingFeedbackDetail.status === 'resolved' ? 'pending' : 'resolved',
                              });
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                              viewingFeedbackDetail.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {viewingFeedbackDetail.status === 'resolved'
                              ? '✓ Đã tiếp thu / xử lý'
                              : '⏳ Đánh dấu đã tiếp thu'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingFeedbackDetail(null)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer"
                          >
                            Đóng
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: SYNC & GITHUB */}
              {activeTab === 'sync' && isFirebaseConfigured() && (
                <div className="space-y-4">
                  <div className="p-5 text-sm text-emerald-900 bg-emerald-50 rounded-xl">Đã bật Firebase: nhấn “Lưu Tất Cả Thay Đổi” để xuất bản ngay. Không cần GitHub Token.</div>
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-base font-bold text-slate-900">Sao lưu và khôi phục nội dung công khai</h3>
                    <p className="text-sm text-slate-600">Tải dữ liệu hiện đang có trên Firebase thành file JSON, không bao gồm hồ sơ học sinh riêng tư. Không dùng dịch vụ trả phí.</p>
                    <button type="button" disabled={restoringBackup || savingOnline} onClick={downloadPublicBackup}
                      className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs">
                      <Download className="w-4 h-4 inline mr-2" /> Tải bản sao lưu JSON
                    </button>
                    <a
                      href="https://github.com/truongthleloipongdrang/truongthleloi-firebase-backups/actions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                      title="Mở GitHub Actions để chạy sao lưu thủ công bằng Run workflow"
                    >
                      <Github className="w-4 h-4 mr-2" /> Mở sao lưu GitHub
                    </a>
                    <p className="text-xs text-slate-500">Đăng nhập GitHub, chọn Run workflow → main → Run workflow. Không cần nhập GitHub Token trên website.</p>
                    <div className="border-t pt-3 space-y-2">
                      <label className="block text-sm font-semibold text-slate-800" htmlFor="restore-public-json">Khôi phục nội dung công khai từ bản sao lưu</label>
                      <p className="text-xs text-amber-800">Hãy tải bản sao lưu hiện tại trước. Khôi phục sẽ ghi đè nội dung công khai ngay trên website; không thay đổi dữ liệu học sinh.</p>
                      <input id="restore-public-json" type="file" accept=".json,application/json"
                        disabled={restoringBackup || savingOnline} onChange={restorePublicBackup}
                        className="text-sm block w-full" />
                    </div>
                    {backupNotice && <p role="status" className="text-sm p-3 bg-slate-100 rounded-lg">{backupNotice}</p>}
                  </div>
                </div>
              )}
              {activeTab === 'sync' && !isFirebaseConfigured() && (
                <div className="space-y-5">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Sao Lưu Dữ Liệu & Đồng Bộ GitHub Repo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quản lý file site-content.json, sao lưu dữ liệu và đẩy lên repository GitHub.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-slate-800">
                        Xuất file dữ liệu (JSON)
                      </h4>
                      <p className="text-xs text-slate-600">
                        Tải toàn bộ nội dung website về máy tính dưới dạng file JSON chuẩn để lưu trữ dự phòng.
                      </p>
                      <button
                        onClick={() => exportContentAsJson(draft)}
                        className="inline-flex items-center bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Tải file JSON về máy
                      </button>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-slate-800">
                        Nạp lại từ GitHub
                      </h4>
                      <p className="text-xs text-slate-600">
                        Đồng bộ lại toàn bộ dữ liệu từ file site-content.json trên GitHub về trang web.
                      </p>
                      <button
                        onClick={async () => {
                          const remote = await fetchRemoteSiteContent();
                          if (remote && remote.schoolInfo) {
                            setDraft(remote);
                            onSaveContent(remote, true);
                            setStatusMsg({ type: 'success', text: 'Đã nạp thành công dữ liệu mới nhất từ GitHub!' });
                          } else {
                            setStatusMsg({ type: 'error', text: 'Chưa thể tải dữ liệu từ GitHub hoặc file chưa cập nhật.' });
                          }
                        }}
                        className="inline-flex items-center bg-white border border-emerald-300 hover:border-emerald-600 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Tải từ GitHub
                      </button>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-slate-800">
                        Khôi phục dữ liệu gốc
                      </h4>
                      <p className="text-xs text-slate-600">
                        Xóa bỏ các chỉnh sửa cục bộ và đưa website về dữ liệu ban đầu của trường Tiểu học Lê Lợi.
                      </p>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Bạn có chắc chắn muốn khôi phục dữ liệu gốc của trường không?'
                            )
                          ) {
                            onResetContent();
                            onClose();
                          }
                        }}
                        className="inline-flex items-center bg-white border border-red-200 hover:border-red-600 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                        Khôi phục gốc
                      </button>
                    </div>
                  </div>

                  {/* GitHub Actions Backup Section */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Github className="w-5 h-5 text-slate-800" />
                      <h4 className="font-bold text-sm text-slate-900">
                        Sao lưu dự phòng qua GitHub Actions
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      Quy trình sao lưu tự động được quản lý an toàn qua GitHub Actions của trường, hoàn toàn không cần nhập GitHub Token trong trình duyệt.
                    </p>
                    <a
                      href="https://github.com/truongthleloipongdrang/truongthleloi-firebase-backups/actions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition-colors"
                      title="Mở GitHub Actions để kiểm tra hoặc kích hoạt sao lưu"
                    >
                      <Github className="w-4 h-4 mr-2" /> Mở sao lưu GitHub
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Bottom Controls */}
        {isAdmin && (
          <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Mẹo: Trên trang web, rê chuột vào bất kỳ thẻ nào và bấm <strong>✏️ Sửa thẻ này</strong> để chỉnh sửa trực quan.
            </span>
            <div className="flex items-center space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Đóng Bảng
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingOnline}
                className="inline-flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingOnline ? 'Đang lưu dữ liệu...' : isOnlineAuthenticated() ? 'Lưu Lên Firebase' : 'Lưu Tất Cả Thay Đổi'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
