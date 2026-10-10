import React, { useState } from 'react';
import {
  Search,
  UserCheck,
  ShieldCheck,
  Award,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Edit,
  GraduationCap,
} from 'lucide-react';
import { StudentRecord, EditableCardPayload } from '../types';
import {
  downloadStudentExcelTemplate,
  exportStudentsToExcel,
  parseStudentExcelFile,
} from '../studentExcelHelper';

interface StudentLookupSectionProps {
  students: StudentRecord[];
  isAdmin: boolean;
  onEditCard: (payload: EditableCardPayload) => void;
  onOpenAdmin: () => void;
  onUpdateStudents?: (newStudents: StudentRecord[]) => void;
}

export const StudentLookupSection: React.FC<StudentLookupSectionProps> = ({
  students,
  isAdmin,
  onEditCard,
  onOpenAdmin,
  onUpdateStudents,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  // Student Excel Import state
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: StudentRecord[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setUploadSuccessMsg(null);
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

  const handleConfirmImport = () => {
    if (!importPreview || !onUpdateStudents) return;

    if (importMode === 'replace') {
      onUpdateStudents(importPreview.students);
      setUploadSuccessMsg(
        `Đã thay thế toàn bộ bằng ${importPreview.students.length} học sinh từ file ${importPreview.fileName}!`
      );
    } else {
      onUpdateStudents([...importPreview.students, ...students]);
      setUploadSuccessMsg(
        `Đã nạp thành công thêm ${importPreview.students.length} học sinh từ file ${importPreview.fileName}!`
      );
    }

    setImportPreview(null);
    setTimeout(() => setUploadSuccessMsg(null), 5000);
  };

  // Extract unique classes
  const classList = Array.from(new Set(students.map((s) => s.className))).sort();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const results = students.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.studentCode.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q);
    const matchesClass =
      selectedClass === 'all' || s.className === selectedClass;
    const matchesCampus =
      selectedCampus === 'all' || (s.campus || 'Trường chính') === selectedCampus;
    return matchesQuery && matchesClass && matchesCampus;
  });

  return (
    <div className="space-y-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
          SỔ LIÊN LẠC SỐ & TRA CỨU
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
          Tra Cứu Thông Tin & Đánh Giá Rèn Luyện Học Sinh
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Tra cứu kết quả học tập và phong trào thi đua theo Thông tư 27/2020/TT-BGDĐT. Cổng tra cứu đảm bảo bảo mật quyền riêng tư cho học sinh.
        </p>
      </div>

      {/* 2. Privacy Policy Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-emerald-950">
            Nguyên tắc bảo vệ dữ liệu học sinh:
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Hệ thống <strong>tuyệt đối không công khai</strong> các thông tin nhạy cảm như: Số CCCD/Định danh cá nhân, ngày sinh đầy đủ, hoặc địa chỉ chi tiết của các em. Chỉ hiển thị kết quả thi đua, rèn luyện và danh hiệu khen thưởng học đường an toàn.
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Nhập mã học sinh hoặc họ tên
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ví dụ: THLL-101 hoặc Y-Kha..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Điểm trường / Phân hiệu
            </label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
            >
              <option value="all">Tất cả điểm trường (Cả 3)</option>
              <option value="Trường chính">Trường chính</option>
              <option value="Phân hiệu 1">Phân hiệu 1</option>
              <option value="Phân hiệu 2">Phân hiệu 2</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Lớp
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
            >
              <option value="all">Tất cả lớp</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  Lớp {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-xs flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Tìm Kiếm Kết Quả</span>
            </button>
          </div>
        </form>

        {/* Admin Quick import/export tools */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
              <div className="flex items-center space-x-2 text-xs text-emerald-950 font-semibold">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Công cụ Quản Trị Học Sinh ({students.length} em):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStudentExcelTemplate}
                  className="inline-flex items-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs transition-colors"
                  title="Tải file mẫu Excel (.xlsx) chuẩn để điền danh sách học sinh"
                >
                  <FileText className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Tải Mẫu Excel
                </button>

                {onUpdateStudents && (
                  <label className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Tải Lên Excel / CSV
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => exportStudentsToExcel(students)}
                  className="inline-flex items-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                  title="Xuất toàn bộ danh sách học sinh ra file Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Xuất Excel
                </button>

                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center text-emerald-800 bg-emerald-200/80 hover:bg-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <span>Mở Bảng Quản Trị</span>
                </button>
              </div>
            </div>

            {/* Success notification banner */}
            {uploadSuccessMsg && (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs p-3 rounded-xl flex items-center justify-between">
                <span className="font-semibold flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
                  {uploadSuccessMsg}
                </span>
                <button
                  type="button"
                  onClick={() => setUploadSuccessMsg(null)}
                  className="font-bold text-emerald-900 ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error banner */}
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

            {/* Import Preview Drawer */}
            {importPreview && (
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-200 shadow-xl">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        Đã đọc file Excel: <span className="text-emerald-800 underline">{importPreview.fileName}</span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        Tìm thấy <strong>{importPreview.students.length} học sinh</strong> trong file. Chọn phương thức nạp dữ liệu:
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="text-xs text-slate-500 hover:text-slate-900 font-bold px-2 py-1 rounded bg-slate-100"
                  >
                    Hủy bỏ
                  </button>
                </div>

                {/* Import options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                      importMode === 'append'
                        ? 'bg-emerald-50/60 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="lookupImportMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ➕ Thêm tiếp vào danh sách hiện tại (Khuyên dùng)
                      </span>
                      <span className="text-slate-600 block mt-0.5 leading-relaxed">
                        Giữ nguyên {students.length} học sinh đang có, nạp thêm {importPreview.students.length} em mới. Tổng cộng: <strong>{students.length + importPreview.students.length}</strong> học sinh.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                      importMode === 'replace'
                        ? 'bg-red-50/60 border-red-500 shadow-xs ring-1 ring-red-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="lookupImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-red-600"
                    />
                    <div>
                      <span className="font-bold text-red-900 block">
                        🔄 Ghi đè thay thế toàn bộ danh sách
                      </span>
                      <span className="text-slate-600 block mt-0.5 leading-relaxed">
                        Xóa toàn bộ {students.length} học sinh cũ và thay bằng {importPreview.students.length} học sinh từ file này.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Table preview (first 5 records) */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-100/70 px-3 py-1.5 text-[11px] font-bold text-emerald-950 flex justify-between items-center">
                    <span>Xem trước dữ liệu trích xuất (5 học sinh đầu):</span>
                    <span className="text-xs bg-emerald-200/80 px-2 py-0.5 rounded-full">
                      5 / {importPreview.students.length} học sinh
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-40">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-white text-slate-700 font-bold uppercase">
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
                      <tbody className="divide-y divide-slate-100 bg-white">
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

                {/* Confirm / Cancel */}
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
                    onClick={handleConfirmImport}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Xác Nhận Nạp {importPreview.students.length} Học Sinh
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Results Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
            KẾT QUẢ TRA CỨU ({results.length} HỌC SINH ĐƯỢC TÌM THẤY)
          </span>
          <span className="text-xs text-slate-400">
            Năm học: 2026 - 2027
          </span>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-6 space-y-2">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">
              Không tìm thấy hồ sơ học sinh phù hợp
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Vui lòng kiểm tra lại chính xác Mã học sinh (ví dụ: THLL-101, THLL-102...) hoặc chọn lại đúng Lớp của học sinh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((st) => (
              <div
                key={st.id}
                className="relative group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                {isAdmin && (
                  <button
                    onClick={() =>
                      onEditCard({
                        sectionKey: 'students',
                        itemId: st.id,
                        title: st.fullName,
                        subtitle: `Mã HS: ${st.studentCode} - Lớp: ${st.className}`,
                        content: `Đánh giá học tập: ${st.academicEvaluation}. Khen thưởng: ${st.awards}`,
                        extraField1Label: 'GVCN',
                        extraField1Value: st.teacherName,
                        extraField2Label: 'Khen thưởng',
                        extraField2Value: st.awards,
                      })
                    }
                    className="absolute top-2.5 right-2.5 z-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow"
                  >
                    Sửa thẻ này
                  </button>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                        {st.studentCode}
                      </span>
                      <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                        {st.campus || 'Trường chính'}
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                      Lớp {st.className}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {st.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      GVCN: {st.teacherName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Đánh giá học tập:</span>
                      <span className="font-bold text-emerald-800">
                        {st.academicEvaluation}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Rèn luyện phẩm chất:</span>
                      <span className="font-bold text-emerald-800">
                        {st.conductEvaluation}
                      </span>
                    </div>
                  </div>

                  {st.awards && (
                    <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl font-medium flex items-start space-x-1.5">
                      <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{st.awards}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
                  Trường Tiểu Học Lê Lợi - {st.campus || 'Trường chính'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
