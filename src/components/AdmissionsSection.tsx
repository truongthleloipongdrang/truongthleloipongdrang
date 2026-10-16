import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  FileCheck,
  FileText,
  Phone,
  CheckCircle2,
  Clock,
  Send,
  Edit,
  ShieldAlert,
  Download,
  Eye,
  Bell,
  Copy,
  Check,
  Trash2,
  X,
  ClipboardList,
  Search,
} from 'lucide-react';
import { AdmissionsData, EditableCardPayload, AdmissionRegistration } from '../types';
import {
  getStoredRegistrations,
  addAdmissionRegistration,
  updateRegistrationStatus,
  deleteRegistration,
  clearAllRegistrations,
  exportRegistrationsToExcel,
  exportRegistrationsToCsv,
  ADMISSIONS_UPDATE_EVENT,
  triggerTestAdmissionNotification,
} from '../admissionsStorage';

interface AdmissionsSectionProps {
  admissions: AdmissionsData;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const AdmissionsSection: React.FC<AdmissionsSectionProps> = ({
  admissions,
  isAdmin,
  onEditCard,
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState<AdmissionRegistration | null>(null);
  const [registrations, setRegistrations] = useState<AdmissionRegistration[]>(() =>
    getStoredRegistrations()
  );
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAllTop, setConfirmClearAllTop] = useState(false);
  const [confirmClearAllModal, setConfirmClearAllModal] = useState(false);

  const handleDeleteRecord = (id: string) => {
    deleteRegistration(id);
    setRegistrations((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
  };

  const handleClearAllRecords = () => {
    clearAllRegistrations();
    setRegistrations([]);
    setConfirmClearAllTop(false);
    setConfirmClearAllModal(false);
  };

  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    childName: '',
    birthYear: '2020',
    campusChoice: 'Trường chính (Thôn Ea Tút)',
    note: '',
  });

  useEffect(() => {
    const handleUpdate = () => {
      setRegistrations(getStoredRegistrations());
    };
    window.addEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ADMISSIONS_UPDATE_EVENT, handleUpdate);
  }, []);

  const pendingCount = registrations.filter((r) => r.status === 'pending').length;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReg = addAdmissionRegistration({
      parentName: formData.parentName,
      phone: formData.phone,
      childName: formData.childName,
      birthYear: formData.birthYear,
      campusChoice: formData.campusChoice,
      note: formData.note,
    });
    setLastSubmittedRecord(newReg);
    setFormSubmitted(true);
    setRegistrations(getStoredRegistrations());
  };

  const filteredRegistrations = registrations.filter((r) => {
    const q = quickSearch.toLowerCase().trim();
    return (
      !q ||
      r.parentName.toLowerCase().includes(q) ||
      r.childName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.campusChoice.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="relative group text-center max-w-3xl mx-auto space-y-3">
        {isAdmin && (
          <button
            onClick={() =>
              onEditCard({
                sectionKey: 'admissionsHeader',
                title: admissions.headerTitle || 'Kế Hoạch Tuyển Sinh Vào Lớp 1',
                subtitle: admissions.headerTag || `TUYỂN SINH NĂM HỌC ${admissions.academicYear}`,
                content:
                  admissions.headerDescription ||
                  'Trường Tiểu học Lê Lợi nhiệt liệt chào đón các em học sinh bước vào lớp 1! Hãy cùng nhà trường chắp cánh cho những ước mơ đầu đời.',
                extraField1Label: 'Năm học tuyển sinh',
                extraField1Value: admissions.academicYear,
              })
            }
            className="absolute -top-3 right-0 sm:right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Sửa tiêu đề tuyển sinh</span>
          </button>
        )}
        <span className="text-xs uppercase font-extrabold tracking-widest text-amber-800 bg-amber-100 border border-amber-300 px-3.5 py-1 rounded-full inline-block">
          {admissions.headerTag || `TUYỂN SINH NĂM HỌC ${admissions.academicYear}`}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          {admissions.headerTitle || 'Kế Hoạch Tuyển Sinh Vào Lớp 1'}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {admissions.headerDescription ||
            'Trường Tiểu học Lê Lợi nhiệt liệt chào đón các em học sinh bước vào lớp 1! Hãy cùng nhà trường chắp cánh cho những ước mơ đầu đời.'}
        </p>
      </div>

      {/* 2. Key Highlights Banner */}
      <div className="relative group bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        {isAdmin && (
          <button
            onClick={() =>
              onEditCard({
                sectionKey: 'admissionsBanner',
                title: admissions.bannerTitle || 'Tuyển mới 150 Học Sinh Lớp 1',
                subtitle: admissions.bannerTag || 'CHỈ TIÊU & ĐỊA BÀN',
                content:
                  admissions.bannerDescription ||
                  'Bố trí các lớp học phù hợp tại cả 3 điểm trường: Trường chính (Thôn Ea Tút), Phân hiệu 1 và Phân hiệu 2, tạo điều kiện thuận lợi nhất cho gia đình.',
                extraField1Label: 'Số lượng chỉ tiêu',
                extraField1Value: String(admissions.targetCount),
                extraField2Label: 'Hotline tuyển sinh',
                extraField2Value: admissions.hotline,
                extraField3Label: 'Năm học tuyển sinh',
                extraField3Value: admissions.academicYear,
                extraField4Label: 'Ghi chú cam kết',
                extraField4Value: admissions.notes,
              })
            }
            className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Sửa thông tin tuyển sinh</span>
          </button>
        )}

        <div className="space-y-2">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            {admissions.bannerTag || 'CHỈ TIÊU & ĐỊA BÀN'}
          </span>
          <h3 className="text-2xl sm:text-3xl font-black">
            {admissions.bannerTitle || `Tuyển mới ${admissions.targetCount} Học Sinh Lớp 1`}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
            {admissions.bannerDescription ||
              'Bố trí các lớp học phù hợp tại cả 3 điểm trường: Trường chính (Thôn Ea Tút), Phân hiệu 1 và Phân hiệu 2, tạo điều kiện thuận lợi nhất cho gia đình.'}
          </p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-5 text-center shrink-0 w-full sm:w-auto">
          <span className="text-[11px] uppercase tracking-wider text-emerald-200 block font-semibold">
            Đường dây nóng tuyển sinh
          </span>
          <a
            href={`tel:${admissions.hotline}`}
            className="text-2xl font-black text-amber-300 hover:text-white transition-colors block mt-1"
          >
            {admissions.hotline}
          </a>
          <span className="text-[10px] text-emerald-300">
            (Tư vấn & tiếp nhận hồ sơ miễn phí)
          </span>
        </div>
      </div>

      {/* 3. Eligibility & Required Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eligibility */}
        <div className="relative group bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'admissionsEligibility',
                  title: admissions.eligibilityTitle || 'Đối Tượng & Điều Kiện Tuyển Sinh',
                  subtitle: 'Quy định đối tượng tuyển sinh',
                  content: admissions.eligibility.join('\n'),
                  extraField1Label: 'Lưu ý khi nhập',
                  extraField1Value: 'Mỗi điều kiện ghi trên 1 dòng',
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa điều kiện</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3>{admissions.eligibilityTitle || 'Đối Tượng & Điều Kiện Tuyển Sinh'}</h3>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            {admissions.eligibility.map((el, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="leading-relaxed">{el}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Required Documents */}
        <div className="relative group bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'admissionsRequiredDocs',
                  title: admissions.requiredDocsTitle || 'Hồ Sơ Cần Chuẩn Bị',
                  subtitle: 'Hồ sơ thủ tục nhập học',
                  content: admissions.requiredDocs.join('\n'),
                  extraField1Label: 'Lưu ý khi nhập',
                  extraField1Value: 'Mỗi loại giấy tờ ghi trên 1 dòng',
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa hồ sơ</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <h3>{admissions.requiredDocsTitle || 'Hồ Sơ Cần Chuẩn Bị'}</h3>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            {admissions.requiredDocs.map((doc, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Timeline Steps */}
      <section className="relative group bg-emerald-50/60 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-6">
        {isAdmin && (
          <button
            onClick={() =>
              onEditCard({
                sectionKey: 'admissionsScheduleHeader',
                title: admissions.scheduleTitle || 'Quy Trình 4 Bước Tuyển Sinh Lớp 1',
                subtitle: admissions.scheduleTag || 'LỊCH TRÌNH TIẾP NHẬN',
                content: 'Lịch trình các bước tuyển sinh lớp 1 tại Trường Tiểu học Lê Lợi.',
              })
            }
            className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Sửa tiêu đề lịch trình</span>
          </button>
        )}

        <div className="text-center space-y-1">
          <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800">
            {admissions.scheduleTag || 'LỊCH TRÌNH TIẾP NHẬN'}
          </span>
          <h3 className="text-2xl font-black text-slate-900">
            {admissions.scheduleTitle || 'Quy Trình 4 Bước Tuyển Sinh Lớp 1'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {admissions.schedule.map((step) => (
            <div
              key={step.step}
              className="relative group/step bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 space-y-2 shadow-xs flex flex-col justify-between"
            >
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'admissionsScheduleStep',
                      itemId: String(step.step),
                      title: step.title,
                      subtitle: `Bước 0${step.step}`,
                      content: step.description,
                      extraField1Label: 'Thời gian thực hiện',
                      extraField1Value: step.time,
                    })
                  }
                  className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[9px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-2.5 h-2.5" />
                  <span>Sửa bước {step.step}</span>
                </button>
              )}

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-sm flex items-center justify-center">
                  0{step.step}
                </div>
                <span className="text-[11px] font-bold text-amber-700 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {step.time}
                </span>
                <h4 className="font-bold text-sm text-slate-900 leading-snug">{step.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Online Consultation Form */}
      <section className="relative group bg-white border border-emerald-100 rounded-3xl p-6 sm:p-10 shadow-md">
        {isAdmin && (
          <button
            onClick={() =>
              onEditCard({
                sectionKey: 'admissionsConsultation',
                title: admissions.consultationTitle || 'Đăng Ký Tư Vấn Tuyển Sinh Trực Tuyến',
                subtitle: admissions.consultationTag || 'HỖ TRỢ PHỤ HUYNH',
                content:
                  admissions.consultationDescription ||
                  'Phụ huynh có thể để lại thông tin tại đây, Ban Giám hiệu và cán bộ tuyển sinh trường Lê Lợi sẽ chủ động liên hệ hướng dẫn chu đáo.',
              })
            }
            className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Sửa tiêu đề form</span>
          </button>
        )}

        {/* School & Admin Notification & Action Bar */}
        {isAdmin && (
          <div className="mb-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    BẢNG ĐIỀU KHIỂN TIẾP NHẬN TUYỂN SINH
                  </span>
                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      {pendingCount} hồ sơ mới
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  Nhà trường hiện có <strong>{registrations.length} phụ huynh</strong> đăng ký tư vấn trực tuyến
                </h4>
                <p className="text-[11px] text-emerald-200/80">
                  Danh sách phụ huynh đăng ký vào lớp 1 năm học {admissions.academicYear}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => exportRegistrationsToExcel(registrations)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Tải file Excel tổng hợp danh sách phụ huynh đăng ký"
              >
                <Download className="w-4 h-4" />
                <span>Tải Danh Sách Tổng Hợp (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickModal(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Xem Danh Sách ({registrations.length})</span>
              </button>
              {registrations.length > 0 && (
                confirmClearAllTop ? (
                  <div className="flex items-center gap-1.5 bg-red-950/70 p-1 rounded-xl border border-red-400/50 animate-in fade-in">
                    <span className="text-[11px] text-red-200 font-bold px-2">Xóa toàn bộ danh sách?</span>
                    <button
                      type="button"
                      onClick={handleClearAllRecords}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-sm transition-all"
                    >
                      Đồng ý xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAllTop(false)}
                      className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAllTop(true)}
                    className="bg-red-500/20 hover:bg-red-500/35 text-red-200 hover:text-white border border-red-400/40 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Xóa toàn bộ danh sách khi đã tuyển sinh xong"
                  >
                    <Trash2 className="w-4 h-4 text-red-300" />
                    <span>Xóa Tất Cả (Đã Tuyển Sinh Xong)</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              {admissions.consultationTag || 'HỖ TRỢ PHỤ HUYNH'}
            </span>
            <h3 className="text-2xl font-black text-slate-900">
              {admissions.consultationTitle || 'Đăng Ký Tư Vấn Tuyển Sinh Trực Tuyến'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {admissions.consultationDescription ||
                'Phụ huynh có thể để lại thông tin tại đây, Ban Giám hiệu và cán bộ tuyển sinh trường Lê Lợi sẽ chủ động liên hệ hướng dẫn chu đáo.'}
            </p>
          </div>

          {formSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  TIẾP NHẬN THÀNH CÔNG
                </span>
                <h4 className="text-xl font-black text-emerald-950 pt-2">
                  Đã Gửi Thông Tin Tư Vấn Tuyển Sinh!
                </h4>
              </div>

              {/* Notification badge confirming receipt by school */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-4 max-w-lg mx-auto text-left space-y-2 shadow-2xs">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 border-b border-emerald-100 pb-2">
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>THÔNG BÁO TỚI BAN TUYỂN SINH NHÀ TRƯỜNG:</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p>
                    • Mã tiếp nhận hồ sơ: <strong className="font-mono text-emerald-800">#{lastSubmittedRecord?.id.slice(-6).toUpperCase() || 'LL-2026'}</strong>
                  </p>
                  <p>
                    • Học sinh: <strong className="text-slate-900">{formData.childName}</strong> (sinh năm {formData.birthYear})
                  </p>
                  <p>
                    • Phụ huynh đăng ký: <strong className="text-slate-900">{formData.parentName}</strong> - SĐT: <strong className="text-emerald-700">{formData.phone}</strong>
                  </p>
                  <p>
                    • Điểm trường: <strong className="text-emerald-800">{formData.campusChoice}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1 italic">
                    Hệ thống đã lưu thông tin vào danh sách tổng hợp. Thầy cô Ban Giám hiệu / cán bộ tuyển sinh trường TH Lê Lợi đã nhận thông báo và sẽ chủ động gọi điện hỗ trợ phụ huynh trong thời gian sớm nhất.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setFormData({
                      parentName: '',
                      phone: '',
                      childName: '',
                      birthYear: '2020',
                      campusChoice: 'Trường chính (Thôn Ea Tút)',
                      note: '',
                    });
                    setFormSubmitted(false);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                >
                  Đăng Ký Thêm Cho Học Sinh Khác
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Hệ thống tự động tiếp nhận và chuyển thông báo đến Ban tuyển sinh trường Tiểu học Lê Lợi.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                  Năm học {admissions.academicYear}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Họ tên cha / mẹ / người giám hộ
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={(e) =>
                      setFormData({ ...formData, parentName: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="09..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Họ tên học sinh
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.childName}
                    onChange={(e) =>
                      setFormData({ ...formData, childName: e.target.value })
                    }
                    placeholder="Nguyễn Hoàng..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nguyện vọng điểm trường
                  </label>
                  <select
                    value={formData.campusChoice}
                    onChange={(e) =>
                      setFormData({ ...formData, campusChoice: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium"
                  >
                    <option value="Trường chính (Thôn Ea Tút)">
                      Trường chính (Thôn Ea Tút)
                    </option>
                    <option value="Phân hiệu 1">Phân hiệu 1</option>
                    <option value="Phân hiệu 2">Phân hiệu 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú hoặc câu hỏi cho nhà trường
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Ví dụ: Xin tư vấn về chuyển trường, chính sách miễn giảm học phí cho con em đồng bào..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl p-3 text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Đăng Ký Tư Vấn Tuyển Sinh</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Quick Modal for Viewing & Downloading Admissions Registrations */}
      {showQuickModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Danh Sách Tổng Hợp Đăng Ký Tuyển Sinh
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Tổng số: {registrations.length} lượt đăng ký • {pendingCount} đơn chưa liên hệ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Tìm theo phụ huynh, học sinh hoặc số điện thoại..."
                  className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportRegistrationsToExcel(filteredRegistrations)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportRegistrationsToCsv(filteredRegistrations)}
                  className="bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Xuất CSV</span>
                </button>

                {isAdmin && (
                  confirmClearAllModal ? (
                    <div className="flex items-center gap-1.5 bg-red-100 p-1 rounded-xl border border-red-300 animate-in fade-in">
                      <span className="text-[11px] text-red-900 font-bold px-1.5">Xóa tất cả?</span>
                      <button
                        type="button"
                        onClick={handleClearAllRecords}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-all"
                      >
                        Đồng ý
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllModal(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAllModal(true)}
                      disabled={registrations.length === 0}
                      className="bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Xóa toàn bộ danh sách khi đã tuyển sinh xong"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span>Xóa Tất Cả (Đã Tuyển Sinh Xong)</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Phụ huynh & SĐT</th>
                      <th className="py-2.5 px-3">Học sinh & Điểm trường</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                          Chưa có thông tin đăng ký phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg, idx) => (
                        <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {reg.submittedAt}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{reg.parentName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <a
                                href={`tel:${reg.phone}`}
                                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
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
                                title="Sao chép SĐT"
                              >
                                {copiedPhoneId === reg.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {reg.childName} <span className="font-normal text-slate-500">({reg.birthYear})</span>
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              {reg.campusChoice}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs text-xs">
                            <p className="line-clamp-2" title={reg.note}>{reg.note}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                updateRegistrationStatus(
                                  reg.id,
                                  reg.status === 'contacted' ? 'pending' : 'contacted'
                                )
                              }
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                reg.status === 'contacted'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                              }`}
                            >
                              {reg.status === 'contacted' ? 'Đã liên hệ' : 'Chưa liên hệ'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {confirmDeleteId === reg.id ? (
                              <div className="flex items-center justify-end gap-1 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(reg.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-xs cursor-pointer"
                                  title="Xác nhận xóa học sinh này"
                                >
                                  Xác nhận xóa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-1 rounded text-[10px] cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(reg.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa hồ sơ học sinh này"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Footer */}
            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Đang hiển thị {filteredRegistrations.length} / {registrations.length} hồ sơ</span>
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
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
