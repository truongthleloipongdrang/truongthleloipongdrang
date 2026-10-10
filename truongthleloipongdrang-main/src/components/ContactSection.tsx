import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Building,
  CheckCircle2,
  Edit,
  ShieldCheck,
} from 'lucide-react';
import { SchoolInfo, EditableCardPayload } from '../types';

interface ContactSectionProps {
  schoolInfo: SchoolInfo;
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  schoolInfo,
  isAdmin,
  onEditCard,
}) => {
  const [formSent, setFormSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <div className="space-y-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          KẾT NỐI NHÀ TRƯỜNG
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          Thông Tin Liên Hệ & Bản Đồ Điểm Trường
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Ban Giám hiệu và tập thể giáo viên Trường Tiểu học Lê Lợi luôn sẵn sàng
          lắng nghe và giải đáp mọi thắc mắc của quý phụ huynh và nhân dân.
        </p>
      </div>

      {/* 2. Contact Cards Grid (Main + 2 Branches + Working hours) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Campus Card */}
        <div className="relative group bg-white border border-emerald-200 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-4">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'mainCampus',
                  title: schoolInfo.mainCampusName || 'Thôn Ea Tút, Pơng Drang',
                  subtitle: schoolInfo.mainCampusTag || 'TRƯỜNG CHÍNH (TRUNG TÂM)',
                  content: schoolInfo.fullAddress,
                  extraField1Label: 'Người quản lý',
                  extraField1Value:
                    schoolInfo.mainCampusLeader ||
                    'Thầy Nguyễn Thanh Bình (Hiệu trưởng) & Cô Lại Thị Tho (Phó Hiệu trưởng)',
                  extraField2Label: 'Hotline',
                  extraField2Value: schoolInfo.phone,
                  extraField3Label: 'Email',
                  extraField3Value: schoolInfo.email,
                })
              }
              className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ này</span>
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
              {schoolInfo.mainCampusTag || 'TRƯỜNG CHÍNH (TRUNG TÂM)'}
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {schoolInfo.mainCampusName || 'Thôn Ea Tút, Pơng Drang'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Quản lý: <strong>{schoolInfo.mainCampusLeader || 'Thầy Nguyễn Thanh Bình (Hiệu trưởng) & Cô Lại Thị Tho (Phó Hiệu trưởng)'}</strong>
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600 shrink-0 mt-0.5" />
              <span>{schoolInfo.fullAddress}</span>
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <a
                href={`tel:${schoolInfo.phone}`}
                className="hover:underline font-bold text-emerald-800"
              >
                {schoolInfo.phone}
              </a>
            </div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span className="truncate">{schoolInfo.email}</span>
            </div>
          </div>
        </div>

        {/* Branch 1 Card */}
        <div className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-4">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'branch1',
                  title: schoolInfo.branch1Name || 'Điểm Trường Phân Hiệu 1',
                  subtitle: schoolInfo.branch1Tag || 'PHÂN HIỆU 1',
                  content: schoolInfo.branch1Address || 'Địa bàn buôn làng lân cận Xã Pơng Drang, Tỉnh Đắk Lắk',
                  extraField1Label: 'Người quản lý',
                  extraField1Value: schoolInfo.branch1Leader || 'Cô Đỗ Thị Phục (Phó Hiệu trưởng)',
                  extraField2Label: 'Hotline chung',
                  extraField2Value: schoolInfo.branch1Phone || schoolInfo.phone,
                  extraField3Label: 'Ghi chú đặc điểm',
                  extraField3Value: schoolInfo.branch1Note || 'Đầy đủ phòng học kiên cố & sân chơi',
                })
              }
              className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ này</span>
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
              {schoolInfo.branch1Tag || 'PHÂN HIỆU 1'}
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {schoolInfo.branch1Name || 'Điểm Trường Phân Hiệu 1'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Quản lý: <strong>{schoolInfo.branch1Leader || 'Cô Đỗ Thị Phục (Phó Hiệu trưởng)'}</strong>
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600 shrink-0 mt-0.5" />
              <span>{schoolInfo.branch1Address || 'Địa bàn buôn làng lân cận Xã Pơng Drang, Tỉnh Đắk Lắk'}</span>
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span>Hotline chung: {schoolInfo.branch1Phone || schoolInfo.phone}</span>
            </div>
            <div className="flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span>{schoolInfo.branch1Note || 'Đầy đủ phòng học kiên cố & sân chơi'}</span>
            </div>
          </div>
        </div>

        {/* Branch 2 Card */}
        <div className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-4">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'branch2',
                  title: schoolInfo.branch2Name || 'Điểm Trường Phân Hiệu 2',
                  subtitle: schoolInfo.branch2Tag || 'PHÂN HIỆU 2',
                  content: schoolInfo.branch2Address || 'Địa bàn khu dân cư Xã Pơng Drang, Tỉnh Đắk Lắk',
                  extraField1Label: 'Người quản lý',
                  extraField1Value: schoolInfo.branch2Leader || 'Thầy Trần Mạnh Thắng (Phó Hiệu trưởng)',
                  extraField2Label: 'Hotline chung',
                  extraField2Value: schoolInfo.branch2Phone || schoolInfo.phone,
                  extraField3Label: 'Thời gian học tập',
                  extraField3Value: schoolInfo.branch2Note || 'Thứ Hai - Thứ Sáu (Học 2 buổi/ngày)',
                })
              }
              className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa thẻ này</span>
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
              {schoolInfo.branch2Tag || 'PHÂN HIỆU 2'}
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {schoolInfo.branch2Name || 'Điểm Trường Phân Hiệu 2'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Quản lý: <strong>{schoolInfo.branch2Leader || 'Thầy Trần Mạnh Thắng (Phó Hiệu trưởng)'}</strong>
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600 shrink-0 mt-0.5" />
              <span>{schoolInfo.branch2Address || 'Địa bàn khu dân cư Xã Pơng Drang, Tỉnh Đắk Lắk'}</span>
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span>Hotline chung: {schoolInfo.branch2Phone || schoolInfo.phone}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span>{schoolInfo.branch2Note || 'Thứ Hai - Thứ Sáu (Học 2 buổi/ngày)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Working Hours & Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Working Hours Info Box */}
        <div className="relative group lg:col-span-5 bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          {isAdmin && (
            <button
              onClick={() =>
                onEditCard({
                  sectionKey: 'schoolSchedule',
                  title: schoolInfo.scheduleTitle || 'Thời Gian Giảng Dạy & Làm Việc',
                  subtitle: schoolInfo.scheduleTag || 'LỊCH LÀM VIỆC & TIẾP DÂN',
                  content:
                    schoolInfo.scheduleDescription ||
                    'Trường Tiểu học Lê Lợi tổ chức dạy học 2 buổi/ngày theo Chương trình GDPT 2018. Văn phòng nhà trường tiếp phụ huynh trong giờ hành chính.',
                  extraField1Label: 'Thời gian Buổi Sáng',
                  extraField1Value:
                    schoolInfo.scheduleMorningTime ||
                    '• Giờ học sinh vào lớp: 07:00\n• Giờ tan học buổi sáng: 11:15',
                  extraField2Label: 'Thời gian Buổi Chiều',
                  extraField2Value:
                    schoolInfo.scheduleAfternoonTime ||
                    '• Giờ học sinh vào lớp: 13:45\n• Giờ tan học buổi chiều: 16:45',
                  extraField3Label: 'Lịch Tiếp Dân Của BGH',
                  extraField3Value:
                    schoolInfo.scheduleReceptionTime ||
                    '• Sáng thứ Hai & Sáng thứ Sáu hàng tuần\n• Trực tiếp tại phòng Hiệu trưởng (Trường chính)',
                })
              }
              className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-full text-[10px] shadow flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Sửa lịch làm việc</span>
            </button>
          )}

          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              {schoolInfo.scheduleTag || 'LỊCH LÀM VIỆC & TIẾP DÂN'}
            </span>
            <h3 className="text-2xl font-black">{schoolInfo.scheduleTitle || 'Thời Gian Giảng Dạy & Làm Việc'}</h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {schoolInfo.scheduleDescription ||
                'Trường Tiểu học Lê Lợi tổ chức dạy học 2 buổi/ngày theo Chương trình GDPT 2018. Văn phòng nhà trường tiếp phụ huynh trong giờ hành chính.'}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Buổi Sáng */}
            <div className="relative group/box bg-white/10 p-3.5 rounded-2xl space-y-1">
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'scheduleMorning',
                      title: schoolInfo.scheduleMorningTitle || 'Buổi Sáng:',
                      subtitle: 'Thời gian học buổi sáng',
                      content:
                        schoolInfo.scheduleMorningTime ||
                        '• Giờ học sinh vào lớp: 07:00\n• Giờ tan học buổi sáng: 11:15',
                    })
                  }
                  className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[9px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-2.5 h-2.5" />
                  <span>Sửa giờ sáng</span>
                </button>
              )}
              <span className="font-bold text-amber-300 block">
                {schoolInfo.scheduleMorningTitle || 'Buổi Sáng:'}
              </span>
              {(schoolInfo.scheduleMorningTime || '• Giờ học sinh vào lớp: 07:00\n• Giờ tan học buổi sáng: 11:15')
                .split('\n')
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i}>{line.startsWith('•') ? line : `• ${line}`}</p>
                ))}
            </div>

            {/* Buổi Chiều */}
            <div className="relative group/box bg-white/10 p-3.5 rounded-2xl space-y-1">
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'scheduleAfternoon',
                      title: schoolInfo.scheduleAfternoonTitle || 'Buổi Chiều:',
                      subtitle: 'Thời gian học buổi chiều',
                      content:
                        schoolInfo.scheduleAfternoonTime ||
                        '• Giờ học sinh vào lớp: 13:45\n• Giờ tan học buổi chiều: 16:45',
                    })
                  }
                  className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[9px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-2.5 h-2.5" />
                  <span>Sửa giờ chiều</span>
                </button>
              )}
              <span className="font-bold text-amber-300 block">
                {schoolInfo.scheduleAfternoonTitle || 'Buổi Chiều:'}
              </span>
              {(schoolInfo.scheduleAfternoonTime || '• Giờ học sinh vào lớp: 13:45\n• Giờ tan học buổi chiều: 16:45')
                .split('\n')
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i}>{line.startsWith('•') ? line : `• ${line}`}</p>
                ))}
            </div>

            {/* Lịch Tiếp Dân Của BGH */}
            <div className="relative group/box bg-white/10 p-3.5 rounded-2xl space-y-1">
              {isAdmin && (
                <button
                  onClick={() =>
                    onEditCard({
                      sectionKey: 'scheduleReception',
                      title: schoolInfo.scheduleReceptionTitle || 'Lịch Tiếp Dân Của BGH:',
                      subtitle: 'Thời gian & địa điểm tiếp dân',
                      content:
                        schoolInfo.scheduleReceptionTime ||
                        '• Sáng thứ Hai & Sáng thứ Sáu hàng tuần\n• Trực tiếp tại phòng Hiệu trưởng (Trường chính)',
                    })
                  }
                  className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[9px] shadow flex items-center space-x-1"
                >
                  <Edit className="w-2.5 h-2.5" />
                  <span>Sửa lịch tiếp dân</span>
                </button>
              )}
              <span className="font-bold text-amber-300 block">
                {schoolInfo.scheduleReceptionTitle || 'Lịch Tiếp Dân Của BGH:'}
              </span>
              {(schoolInfo.scheduleReceptionTime || '• Sáng thứ Hai & Sáng thứ Sáu hàng tuần\n• Trực tiếp tại phòng Hiệu trưởng (Trường chính)')
                .split('\n')
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i}>{line.startsWith('•') ? line : `• ${line}`}</p>
                ))}
            </div>
          </div>
        </div>

        {/* Feedback / Contact Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-2 mb-6">
            <h3 className="text-xl font-black text-slate-900">
              Gửi Ý Kiến Đóng Góp / Phản Ánh
            </h3>
            <p className="text-xs text-slate-600">
              Mọi ý kiến của quý phụ huynh và nhân dân sẽ được chuyển trực tiếp đến Ban Giám hiệu để tiếp thu và phản hồi kịp thời.
            </p>
          </div>

          {formSent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-base">
                Cảm ơn quý vị đã gửi ý kiến!
              </h4>
              <p className="text-xs text-emerald-800">
                Ý kiến đã được chuyển tới hộp thư điện tử nhà trường ({schoolInfo.email}).
              </p>
              <button
                onClick={() => setFormSent(false)}
                className="text-xs font-bold text-emerald-700 underline mt-2"
              >
                Gửi thêm ý kiến khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email (nếu có)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vidu@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung liên hệ / Trao đổi
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Kính gửi Ban Giám hiệu trường Tiểu học Lê Lợi..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl p-3 text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Ý Kiến Cho Nhà Trường</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
