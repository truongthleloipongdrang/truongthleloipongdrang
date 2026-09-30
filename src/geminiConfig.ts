/**
 * Gemini AI Helper for generating professional teacher and administrator bios
 * Calls server-side endpoint (/api/generate-description) to protect API keys.
 * Includes intelligent fallback for static deployment on GitHub Pages.
 */

export interface TeacherPromptParams {
  name: string;
  role: string;
  subjectOrGrade: string;
  campus: string;
  qualification: string;
  achievements?: string[];
  keyHighlight?: string;
}

export async function generateTeacherBioWithAI(params: TeacherPromptParams): Promise<string> {
  const prompt = `Bạn là chuyên gia truyền thông giáo dục tiểu học tại Việt Nam.
Hãy viết một đoạn mô tả (tiểu sử ngắn khoảng 3-4 câu, từ 60-90 từ) thật truyền cảm, trang trọng, ấm áp và chuyên nghiệp cho thầy/cô giáo trường Tiểu học Lê Lợi (Thôn Ea Tút, Xã Pơng Drang, Tỉnh Đắk Lắk).
Thông tin:
- Họ và tên: ${params.name}
- Chức vụ: ${params.role}
- Phụ trách/Chuyên môn: ${params.subjectOrGrade}
- Nơi công tác: ${params.campus}
- Trình độ: ${params.qualification}
- Thành tích nổi bật: ${params.achievements?.join(', ') || 'Nhiều năm cống hiến cho giáo dục vùng Tây Nguyên'}
${params.keyHighlight ? `- Điểm nhấn bổ sung: ${params.keyHighlight}` : ''}

Yêu cầu:
- Viết bằng tiếng Việt chuẩn mực, tôn vinh đạo đức nghề giáo, tinh thần tận tụy vì học sinh vùng sâu vùng xa Tây Nguyên.
- Giọng văn ấm áp, chân thành, tự nhiên, không sáo rỗng.
- Chỉ trả về đoạn văn mô tả, không thêm lời chào mở đầu hay kết thúc.`;

  try {
    const res = await fetch('/api/generate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, params }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text && typeof data.text === 'string' && data.text.trim().length > 0) {
        return data.text.trim();
      }
    }
  } catch {
    // Backend endpoint unreachable (e.g. running on static GitHub Pages)
  }

  // Smart fallback synthesizer for GitHub Pages environment:
  return generateOfflineSmartBio(params);
}

function generateOfflineSmartBio(p: TeacherPromptParams): string {
  const achievementsStr = p.achievements && p.achievements.length > 0
    ? ` Từng vinh dự đạt thành tích: ${p.achievements.join(', ')}.`
    : '';

  if (p.role.toLowerCase().includes('hiệu trưởng')) {
    return `Với tinh thần trách nhiệm cao và lòng tâm huyết sâu sắc đối với sự nghiệp trồng người tại vùng đất Đắk Lắk, ${p.name} luôn gương mẫu, đổi mới phương pháp quản trị nhà trường. Thầy/Cô chú trọng xây dựng Trường Tiểu học Lê Lợi thành một mái trường hạnh phúc, thân thiện, nâng bước các thế hệ học sinh vững bước vào tương lai.${achievementsStr}`;
  }

  if (p.role.toLowerCase().includes('đội') || p.role.toLowerCase().includes('tổng phụ trách')) {
    return `Là người truyền lửa nhiệt huyết cho phong trào thiếu nhi tại Trường Tiểu học Lê Lợi, ${p.name} luôn đồng hành sát sao cùng các em học sinh qua từng buổi sinh hoạt truyền thống, hội thi văn nghệ cồng chiêng và các hoạt động trải nghiệm bổ ích.${achievementsStr} Thầy/Cô là tấm gương mẫu mực về lòng yêu trẻ và năng động sáng tạo.`;
  }

  return `Là một nhà giáo tận tâm với nghề tại ${p.campus}, ${p.name} luôn ân cần, thấu hiểu tâm lý lứa tuổi tiểu học và không ngừng đổi mới phương pháp giảng dạy.${achievementsStr} Với chuyên môn ${p.qualification}, Thầy/Cô đã khơi dậy niềm đam mê học tập, rèn luyện nhân cách và nuôi dưỡng ước mơ đẹp cho các em học sinh nơi đại ngàn Pơng Drang.`;
}
