export type NavSection =
  | 'home'
  | 'about'
  | 'staff'
  | 'news'
  | 'activities'
  | 'admissions'
  | 'student-lookup'
  | 'documents'
  | 'gallery'
  | 'contact';

export interface SchoolInfo {
  name: string;
  shortName: string;
  address: string;
  village: string;
  commune: string;
  province: string;
  fullAddress: string;
  phone: string;
  email: string;
  slogan: string;
  establishedYear: string;
  heroBadge?: string;
  heroDescription?: string;
  statsAcademicYear?: string;
  leadershipText?: string;
  stats: {
    studentsCount: number;
    teachersCount: number;
    classesCount: number;
    branchesCount: number;
    standardLevel: string;
  };

  // Main campus details
  mainCampusTag?: string;
  mainCampusName?: string;
  mainCampusLeader?: string;

  // Branch 1 details
  branch1Tag?: string;
  branch1Name?: string;
  branch1Leader?: string;
  branch1Address?: string;
  branch1Phone?: string;
  branch1Note?: string;

  // Branch 2 details
  branch2Tag?: string;
  branch2Name?: string;
  branch2Leader?: string;
  branch2Address?: string;
  branch2Phone?: string;
  branch2Note?: string;

  // Working & Reception schedule (Image 1)
  scheduleTag?: string;
  scheduleTitle?: string;
  scheduleDescription?: string;
  scheduleMorningTitle?: string;
  scheduleMorningTime?: string;
  scheduleAfternoonTitle?: string;
  scheduleAfternoonTime?: string;
  scheduleReceptionTitle?: string;
  scheduleReceptionTime?: string;

  // Documents teaser on Home
  docsTeaserTag?: string;
  docsTeaserTitle?: string;
  docsTeaserDescription?: string;
  docsTeaserButtonText?: string;
}

export interface PrincipalLeader {
  id: string;
  name: string;
  title: string;
  roleScope: string;
  campus: string;
  phone?: string;
  email?: string;
  bio: string;
  avatar: string;
}

export interface Teacher {
  id: string;
  name: string;
  role: string;
  subjectOrGrade: string;
  campus: 'Trường chính' | 'Phân hiệu 1' | 'Phân hiệu 2' | 'Toàn trường';
  bio: string;
  avatar: string;
  qualification: string;
  achievements?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  category: 'thong-bao' | 'tin-tuc' | 'hoat-dong' | 'chuyen-doi-so';
  categoryLabel: string;
  summary: string;
  content: string;
  date: string;
  author: string;
  imageUrl: string;
  isFeatured?: boolean;
}

export interface ActivityItem {
  id: string;
  title: string;
  category: 'day-hoc' | 'ngoai-khoa' | 'doi-tntp' | 'trai-nghiem' | 'chuyen-doi-so';
  categoryLabel: string;
  date: string;
  description: string;
  content?: string;
  imageUrl: string;
  highlight?: boolean;
}

export interface AdmissionStep {
  step: number;
  title: string;
  time: string;
  description: string;
}

export interface AdmissionsData {
  academicYear: string;
  targetCount: number;
  headerTag?: string;
  headerTitle?: string;
  headerDescription?: string;
  bannerTag?: string;
  bannerTitle?: string;
  bannerDescription?: string;
  eligibilityTitle?: string;
  eligibility: string[];
  requiredDocsTitle?: string;
  requiredDocs: string[];
  scheduleTitle?: string;
  scheduleTag?: string;
  schedule: AdmissionStep[];
  hotline: string;
  notes: string;
  consultationTag?: string;
  consultationTitle?: string;
  consultationDescription?: string;

  // Home teaser banner
  homeTeaserTag?: string;
  homeTeaserTitle?: string;
  homeTeaserDescription?: string;
  homeTeaserButtonText?: string;
}

export const STUDENT_CAMPUS_OPTIONS = [
  'Trường chính',
  'Phân hiệu 1',
  'Phân hiệu 2',
] as const;

export type StudentCampus = typeof STUDENT_CAMPUS_OPTIONS[number];

export interface StudentRecord {
  id: string;
  studentCode: string; // Mã học sinh công khai an toàn, ví dụ: THLL-101
  fullName: string; // Họ tên học sinh
  className: string; // Lớp (1A, 2B,...)
  campus?: StudentCampus | string; // Điểm trường: Trường chính, Phân hiệu 1, Phân hiệu 2
  academicYear: string;
  academicEvaluation: 'Hoàn thành xuất sắc' | 'Hoàn thành tốt' | 'Hoàn thành' | 'Cần cố gắng';
  conductEvaluation: 'Tốt' | 'Đạt' | 'Cần rèn luyện thêm';
  teacherName: string;
  awards: string;
  // Tuyệt đối không lưu CCCD, ngày sinh đầy đủ, địa chỉ chi tiết công khai
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'hoat-dong' | 'co-so-vat-chat' | 'su-kien';
  imageUrl: string;
  caption: string;
  date: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'giao-an' | 'de-thi' | 'van-ban' | 'tap-huan' | 'stem' | 'hoc-sinh';
  categoryLabel: string;
  fileSize: string;
  fileType: string;
  uploadDate: string;
  uploaderName: string;
  uploaderEmail: string;
  downloadCount: number;
  description: string;
  downloadUrl: string;
}

export interface MemberUser {
  id: string;
  email: string;
  name: string;
  role: 'Giáo viên' | 'Phụ huynh' | 'Học sinh' | 'Cán bộ';
  loginAt: string;
}

export interface SiteContent {
  schoolInfo: SchoolInfo;
  principals: PrincipalLeader[];
  teachers: Teacher[];
  news: NewsItem[];
  activities: ActivityItem[];
  admissions: AdmissionsData;
  students: StudentRecord[];
  gallery: GalleryItem[];
  documents: DocumentItem[];
  history: string;
  historyTitle?: string;
  historyTag?: string;
  historyImageUrl?: string;
  historyImageCaption?: string;
  historyStat1Value?: string;
  historyStat1Label?: string;
  historyStat2Value?: string;
  historyStat2Label?: string;
  historyStat3Value?: string;
  historyStat3Label?: string;
  mission: string;
  missionTitle?: string;
  missionFooter?: string;
  vision: string;
  visionTitle?: string;
  visionFooter?: string;
  coreValues: { title: string; desc: string; icon: string }[];
  facilities: { title: string; desc: string; campus: string; image: string }[];
  contactMessage: string;
}

export interface EditableCardPayload {
  sectionKey: string;
  itemId?: string;
  title: string;
  subtitle?: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  category?: string;
  extraField1Label?: string;
  extraField1Value?: string;
  extraField2Label?: string;
  extraField2Value?: string;
  extraField3Label?: string;
  extraField3Value?: string;
  extraField4Label?: string;
  extraField4Value?: string;
  extraField5Label?: string;
  extraField5Value?: string;
  extraField6Label?: string;
  extraField6Value?: string;
}
