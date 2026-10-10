import React, { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  FileCheck,
  Phone,
  CheckCircle2,
  Clock,
  Send,
  Edit,
  ShieldAlert,
} from 'lucide-react';
import { AdmissionsData, EditableCardPayload } from '../types';

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
  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    childName: '',
    birthYear: '2020',
    campusChoice: 'Trường chính (Thôn Ea Tút)',
    note: '',
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

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
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-950">
                Gửi thông tin tư vấn thành công!
              </h4>
              <p className="text-xs text-emerald-800">
                Nhà trường đã tiếp nhận thông tin của bé <strong>{formData.childName}</strong>. Thầy cô sẽ gọi điện hỗ trợ phụ huynh qua số điện thoại <strong>{formData.phone}</strong> trong thời gian sớm nhất.
              </p>
              <button
                onClick={() => setFormSubmitted(false)}
                className="text-xs font-bold text-emerald-700 hover:underline pt-2"
              >
                Gửi thêm thông tin học sinh khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
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
    </div>
  );
};
