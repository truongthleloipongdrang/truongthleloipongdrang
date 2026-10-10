import * as XLSX from 'xlsx';
import { StudentRecord } from './types';

export const SAMPLE_TEMPLATE_STUDENTS: Omit<StudentRecord, 'id'>[] = [
  {
    studentCode: 'THLL-101',
    fullName: 'Y-Kha Mlô',
    className: '1A',
    campus: 'Trường chính',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành tốt',
    conductEvaluation: 'Tốt',
    teacherName: 'Cô H’Nga Niê',
    awards: 'Chăm ngoan, tiến bộ vượt bậc trong học tập',
  },
  {
    studentCode: 'THLL-102',
    fullName: 'Nguyễn Hoàng Gia Bảo',
    className: '1A',
    campus: 'Trường chính',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành xuất sắc',
    conductEvaluation: 'Tốt',
    teacherName: 'Cô H’Nga Niê',
    awards: 'Học sinh xuất sắc toàn diện',
  },
  {
    studentCode: 'THLL-201',
    fullName: 'H’Bri Hwing',
    className: '2A',
    campus: 'Phân hiệu 1',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành tốt',
    conductEvaluation: 'Tốt',
    teacherName: 'Cô Trần Thị Hương Ly',
    awards: 'Cháu ngoan Bác Hồ, tích cực phong trào',
  },
  {
    studentCode: 'THLL-301',
    fullName: 'Trần Đăng Khoa',
    className: '3B',
    campus: 'Trường chính',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành xuất sắc',
    conductEvaluation: 'Tốt',
    teacherName: 'Cô Nguyễn Thị Mai Trang',
    awards: 'Giải Nhất Olympic Tiếng Anh cấp trường',
  },
  {
    studentCode: 'THLL-401',
    fullName: 'Lê Bảo Anh',
    className: '4A',
    campus: 'Phân hiệu 2',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành xuất sắc',
    conductEvaluation: 'Tốt',
    teacherName: 'Thầy Lê Văn Hoàng',
    awards: 'Giải Ba cuộc thi Sáng tạo Khoa học STEM',
  },
  {
    studentCode: 'THLL-501',
    fullName: 'Y-Thiên Niê',
    className: '5A',
    campus: 'Trường chính',
    academicYear: '2026 - 2027',
    academicEvaluation: 'Hoàn thành tốt',
    conductEvaluation: 'Tốt',
    teacherName: 'Thầy Y-Blơng Mlô',
    awards: 'Chỉ huy Đội giỏi cấp Liên đội',
  },
];

/**
 * Generates and downloads the official sample Excel template (.xlsx)
 */
export function downloadStudentExcelTemplate() {
  const headers = [
    'Mã Học Sinh',
    'Họ và Tên',
    'Lớp',
    'Điểm Trường',
    'Năm Học',
    'Đánh Giá Học Tập',
    'Đánh Giá Rèn Luyện',
    'Giáo Viên Chủ Nhiệm',
    'Khen Thưởng / Danh Hiệu',
  ];

  const dataRows = SAMPLE_TEMPLATE_STUDENTS.map((st) => [
    st.studentCode,
    st.fullName,
    st.className,
    st.campus || 'Trường chính',
    st.academicYear,
    st.academicEvaluation,
    st.conductEvaluation,
    st.teacherName,
    st.awards,
  ]);

  const wsData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Mã HS
    { wch: 26 }, // Họ và tên
    { wch: 8 },  // Lớp
    { wch: 16 }, // Điểm trường
    { wch: 14 }, // Năm học
    { wch: 22 }, // Đánh giá học tập
    { wch: 18 }, // Đánh giá rèn luyện
    { wch: 24 }, // GVCN
    { wch: 38 }, // Khen thưởng
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  // Second instructional sheet
  const instructionHeaders = ['Cột Dữ Liệu', 'Quy Định & Hướng Dẫn Điền'];
  const instructions = [
    ['Mã Học Sinh', 'Mã định danh học đường an toàn, ví dụ: THLL-101, THLL-102... (nếu bỏ trống hệ thống sẽ tự sinh)'],
    ['Họ và Tên', 'Họ và tên đầy đủ của học sinh (Bắt buộc)'],
    ['Lớp', 'Tên lớp học, ví dụ: 1A, 2B, 3C, 4A, 5B... (Bắt buộc)'],
    ['Điểm Trường', 'Chọn: Trường chính, Phân hiệu 1, hoặc Phân hiệu 2 (mặc định là Trường chính)'],
    ['Năm Học', 'Niên khóa học tập, ví dụ: 2026 - 2027 (mặc định)'],
    ['Đánh Giá Học Tập', 'Chọn một trong các mức: Hoàn thành xuất sắc, Hoàn thành tốt, Hoàn thành, Cần cố gắng'],
    ['Đánh Giá Rèn Luyện', 'Chọn một trong các mức: Tốt, Đạt, Cần rèn luyện thêm'],
    ['Giáo Viên Chủ Nhiệm', 'Họ tên thầy cô phụ trách lớp (ví dụ: Cô H’Nga Niê, Thầy Lê Văn Hoàng...)'],
    ['Khen Thưởng / Danh Hiệu', 'Ghi rõ thành tích, danh hiệu học kỳ, năm học nếu có'],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet([instructionHeaders, ...instructions]);
  wsGuide['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDanNhapLieu');

  XLSX.writeFile(wb, `Mau_Nhap_Hoc_Sinh_TH_Le_Loi.xlsx`);
}

/**
 * Exports current student records into an Excel (.xlsx) file
 */
export function exportStudentsToExcel(students: StudentRecord[], filename?: string) {
  const headers = [
    'Mã Học Sinh',
    'Họ và Tên',
    'Lớp',
    'Điểm Trường',
    'Năm Học',
    'Đánh Giá Học Tập',
    'Đánh Giá Rèn Luyện',
    'Giáo Viên Chủ Nhiệm',
    'Khen Thưởng / Danh Hiệu',
  ];

  const dataRows = students.map((st) => [
    st.studentCode,
    st.fullName,
    st.className,
    st.campus || 'Trường chính',
    st.academicYear || '2026 - 2027',
    st.academicEvaluation,
    st.conductEvaluation,
    st.teacherName,
    st.awards || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 26 },
    { wch: 8 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 38 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  const exportName = filename || `Danh_Sach_Hoc_Sinh_TH_Le_Loi_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, exportName);
}

/**
 * Normalizes text to help match column headers flexibly
 */
function cleanHeader(header: any): string {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics
    .replace(/[^a-z0-9]/g, ''); // keep alphanumeric
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into StudentRecord[]
 */
export async function parseStudentExcelFile(
  file: File
): Promise<{ success: boolean; data: StudentRecord[]; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, data: [], error: 'File Excel không có sheet nào.' };
    }

    // Read the first sheet
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Convert to 2D array of rows
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    if (!rows || rows.length < 2) {
      return {
        success: false,
        data: [],
        error: 'File Excel trống hoặc không có dòng dữ liệu nào ngoài tiêu đề.',
      };
    }

    // Header row
    const headerRow = rows[0] as any[];
    const headerIndexes: { [key: string]: number } = {};

    headerRow.forEach((col, index) => {
      const clean = cleanHeader(col);
      if (clean.includes('mahs') || clean.includes('mahocsinh') || clean.includes('code') || clean === 'ma') {
        headerIndexes.code = index;
      } else if (clean.includes('hoten') || clean.includes('hovaten') || clean.includes('ten') || clean.includes('name')) {
        headerIndexes.name = index;
      } else if (clean.includes('lop') || clean.includes('class')) {
        headerIndexes.className = index;
      } else if (clean.includes('diemtruong') || clean.includes('phanhieu') || clean.includes('campus') || clean.includes('coso')) {
        headerIndexes.campus = index;
      } else if (clean.includes('namhoc') || clean.includes('year') || clean.includes('nienkhoa')) {
        headerIndexes.academicYear = index;
      } else if (clean.includes('hoctap') || clean.includes('danhgiahoc') || clean.includes('hoanthanh')) {
        headerIndexes.academicEvaluation = index;
      } else if (clean.includes('renluyen') || clean.includes('hanhkiem') || clean.includes('conduct')) {
        headerIndexes.conductEvaluation = index;
      } else if (clean.includes('gvcn') || clean.includes('giaovien') || clean.includes('chunhiem') || clean.includes('teacher')) {
        headerIndexes.teacher = index;
      } else if (clean.includes('khenthuong') || clean.includes('danhhieu') || clean.includes('thanhtich') || clean.includes('awards')) {
        headerIndexes.awards = index;
      }
    });

    // Fallbacks if not recognized by name
    if (headerIndexes.name === undefined) {
      headerIndexes.name = 1; // Default 2nd column
    }
    if (headerIndexes.code === undefined) headerIndexes.code = 0;
    if (headerIndexes.className === undefined) headerIndexes.className = 2;

    const parsedStudents: StudentRecord[] = [];
    const timestamp = Date.now();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = headerIndexes.name !== undefined ? row[headerIndexes.name] : '';
      const name = rawName ? String(rawName).trim() : '';

      // Skip empty rows without name
      if (!name) continue;

      const rawCode = headerIndexes.code !== undefined ? row[headerIndexes.code] : '';
      const code = rawCode
        ? String(rawCode).trim().toUpperCase()
        : `THLL-${100 + i}`;

      const rawClass = headerIndexes.className !== undefined ? row[headerIndexes.className] : '';
      const className = rawClass ? String(rawClass).trim().toUpperCase() : '1A';

      const rawCampus = headerIndexes.campus !== undefined ? row[headerIndexes.campus] : '';
      let campus: StudentRecord['campus'] = 'Trường chính';
      if (rawCampus) {
        const cCampus = cleanHeader(rawCampus);
        if (cCampus.includes('phanhieu1') || cCampus.includes('ph1') || cCampus.includes('hieu1')) {
          campus = 'Phân hiệu 1';
        } else if (cCampus.includes('phanhieu2') || cCampus.includes('ph2') || cCampus.includes('hieu2')) {
          campus = 'Phân hiệu 2';
        } else {
          campus = 'Trường chính';
        }
      }

      const rawYear = headerIndexes.academicYear !== undefined ? row[headerIndexes.academicYear] : '';
      const academicYear = rawYear ? String(rawYear).trim() : '2026 - 2027';

      const rawAcEval = headerIndexes.academicEvaluation !== undefined ? row[headerIndexes.academicEvaluation] : '';
      let academicEvaluation: StudentRecord['academicEvaluation'] = 'Hoàn thành tốt';
      if (rawAcEval) {
        const cEval = cleanHeader(rawAcEval);
        if (cEval.includes('xuatsac')) {
          academicEvaluation = 'Hoàn thành xuất sắc';
        } else if (cEval.includes('cancogang') || cEval.includes('chuahoanthanh') || cEval.includes('chua')) {
          academicEvaluation = 'Cần cố gắng';
        } else if (cEval.includes('hoanthanh') && !cEval.includes('tot')) {
          academicEvaluation = 'Hoàn thành';
        } else {
          academicEvaluation = 'Hoàn thành tốt';
        }
      }

      const rawCondEval = headerIndexes.conductEvaluation !== undefined ? row[headerIndexes.conductEvaluation] : '';
      let conductEvaluation: StudentRecord['conductEvaluation'] = 'Tốt';
      if (rawCondEval) {
        const cCond = cleanHeader(rawCondEval);
        if (cCond.includes('dat') && !cCond.includes('chua')) {
          conductEvaluation = 'Đạt';
        } else if (cCond.includes('renluyen') || cCond.includes('cancogang') || cCond.includes('chua')) {
          conductEvaluation = 'Cần rèn luyện thêm';
        } else {
          conductEvaluation = 'Tốt';
        }
      }

      const rawTeacher = headerIndexes.teacher !== undefined ? row[headerIndexes.teacher] : '';
      const teacherName = rawTeacher ? String(rawTeacher).trim() : 'Giáo viên chủ nhiệm';

      const rawAwards = headerIndexes.awards !== undefined ? row[headerIndexes.awards] : '';
      const awards = rawAwards ? String(rawAwards).trim() : 'Chăm ngoan học tốt';

      parsedStudents.push({
        id: `std-import-${timestamp}-${i}`,
        studentCode: code,
        fullName: name,
        className,
        campus,
        academicYear,
        academicEvaluation,
        conductEvaluation,
        teacherName,
        awards,
      });
    }

    if (parsedStudents.length === 0) {
      return {
        success: false,
        data: [],
        error: 'Không tìm thấy dữ liệu học sinh hợp lệ trong file. Vui lòng sử dụng file mẫu chuẩn.',
      };
    }

    return {
      success: true,
      data: parsedStudents,
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: `Không thể đọc file: ${err.message || 'Định dạng file không tương thích.'}`,
    };
  }
}
