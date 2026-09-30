import { INITIAL_SITE_CONTENT } from './data';
import { SiteContent } from './types';

const STORAGE_KEY = 'th_leloi_site_content_v1';
const ADMIN_AUTH_KEY = 'th_leloi_admin_hash_v1';
const GITHUB_REPO_INFO = {
  owner: 'truongthyjutpongdrang',
  repo: 'truongthleloipongdrang',
  branch: 'main',
  filePath: 'public/site-content.json',
};

// Safe SHA-256 hash using native Web Crypto API
export async function sha256Hash(text: string): Promise<string> {
  const salt = 'leloi_pongdrang_daklak_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(text + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial default admin password hash (for password: "Leloi@PongDrang2026#")
// Never uses admin/admin or weak passwords!
export const DEFAULT_ADMIN_HASH = '1f6c449c25bb2a4ad313b632049d52033bc6f44d18ec8343f110757277a06f3b';

export function getStoredAdminHash(): string {
  const stored = localStorage.getItem(ADMIN_AUTH_KEY);
  return stored || DEFAULT_ADMIN_HASH;
}

export function setStoredAdminHash(newHash: string): void {
  localStorage.setItem(ADMIN_AUTH_KEY, newHash);
}

export function loadSiteContent(): SiteContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Merge principals ensuring newly added leaders like Cô Lại Thị Tho are preserved
      let mergedPrincipals = parsed.principals;
      if (Array.isArray(parsed.principals)) {
        const existingIds = new Set(parsed.principals.map((p: any) => p.id));
        const newLeaders = INITIAL_SITE_CONTENT.principals.filter((p) => !existingIds.has(p.id));
        if (newLeaders.length > 0) {
          mergedPrincipals = [...parsed.principals, ...newLeaders];
        }
      } else {
        mergedPrincipals = INITIAL_SITE_CONTENT.principals;
      }

      // Explicitly arrange Ban Giám Hiệu order:
      // 1. Thầy Nguyễn Thanh Bình (Hiệu trưởng)
      // 2. Cô Lại Thị Tho (Phó Hiệu trưởng - Trường chính)
      // 3. Cô Đỗ Thị Phục (Phó Hiệu trưởng - Phân hiệu 1)
      // 4. Thầy Trần Mạnh Thắng (Phó Hiệu trưởng - Phân hiệu 2)
      const ORDERED_PRINCIPAL_IDS = ['principal-1', 'principal-4', 'principal-2', 'principal-3'];
      mergedPrincipals.sort((a: any, b: any) => {
        const idxA = ORDERED_PRINCIPAL_IDS.indexOf(a.id);
        const idxB = ORDERED_PRINCIPAL_IDS.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

      // Ensure each student has a valid campus (default to 'Trường chính')
      let mergedStudents = parsed.students;
      if (Array.isArray(parsed.students)) {
        mergedStudents = parsed.students.map((st: any) => ({
          ...st,
          campus: st.campus || 'Trường chính',
        }));
      } else {
        mergedStudents = INITIAL_SITE_CONTENT.students;
      }

      // Merge schoolInfo ensuring leadership info has Cô Lại Thị Tho and general address updated
      const mergedSchoolInfo = {
        ...INITIAL_SITE_CONTENT.schoolInfo,
        ...parsed.schoolInfo,
      };
      if (mergedSchoolInfo.address === 'Thôn Ea Tút') {
        mergedSchoolInfo.address = 'Xã Pơng Drang';
      }
      if (mergedSchoolInfo.fullAddress === 'Thôn Ea Tút, Xã Pơng Drang, Tỉnh Đắk Lắk') {
        mergedSchoolInfo.fullAddress = 'Xã Pơng Drang, Tỉnh Đắk Lắk';
      }
      if (
        mergedSchoolInfo.leadershipText &&
        !mergedSchoolInfo.leadershipText.includes('Lại Thị Tho')
      ) {
        mergedSchoolInfo.leadershipText = INITIAL_SITE_CONTENT.schoolInfo.leadershipText;
      }
      if (
        mergedSchoolInfo.mainCampusLeader &&
        !mergedSchoolInfo.mainCampusLeader.includes('Lại Thị Tho')
      ) {
        mergedSchoolInfo.mainCampusLeader = INITIAL_SITE_CONTENT.schoolInfo.mainCampusLeader;
      }

      return {
        ...INITIAL_SITE_CONTENT,
        ...parsed,
        principals: mergedPrincipals,
        students: mergedStudents,
        schoolInfo: mergedSchoolInfo,
      };
    }
  } catch (err) {
    console.error('Error loading content from storage', err);
  }
  return INITIAL_SITE_CONTENT;
}

export function saveSiteContentLocal(content: SiteContent): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content, null, 2));
}

export function resetSiteContentToDefault(): SiteContent {
  localStorage.removeItem(STORAGE_KEY);
  return INITIAL_SITE_CONTENT;
}

export function exportContentAsJson(content: SiteContent): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `site-content-th-leloi-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export interface SyncToGitHubResult {
  success: boolean;
  message: string;
  commitUrl?: string;
}

/**
 * Direct push to GitHub via REST API
 * Security requirement: Only uses the token in-memory or session, never commits it.
 */
export async function pushContentToGitHub(
  content: SiteContent,
  githubToken: string
): Promise<SyncToGitHubResult> {
  if (!githubToken || githubToken.trim().length === 0) {
    return {
      success: false,
      message: 'Vui lòng cung cấp GitHub Fine-grained Personal Access Token để đồng bộ.',
    };
  }

  const { owner, repo, branch, filePath } = GITHUB_REPO_INFO;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // 1. Get existing file SHA if exists
    let sha: string | undefined;
    const getRes = await fetch(apiUrl + `?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${githubToken.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      sha = existingData.sha;
    }

    // 2. Prepare content base64
    const contentString = JSON.stringify(content, null, 2);
    // Browser UTF-8 to base64
    const encodedContent = btoa(unescape(encodeURIComponent(contentString)));

    const bodyPayload: Record<string, unknown> = {
      message: `Cập nhật nội dung website qua cổng quản trị [${new Date().toLocaleString('vi-VN')}]`,
      content: encodedContent,
      branch: branch,
    };
    if (sha) {
      bodyPayload.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (putRes.ok) {
      const result = await putRes.json();
      return {
        success: true,
        message: 'Đồng bộ lên GitHub thành công! GitHub Actions sẽ tự động cập nhật bản phát hành.',
        commitUrl: result.commit?.html_url,
      };
    } else {
      const errJson = await putRes.json();
      return {
        success: false,
        message: `Lỗi từ GitHub (${putRes.status}): ${errJson.message || 'Kiểm tra lại quyền Contents: Read and write của token'}`,
      };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return {
      success: false,
      message: `Lỗi kết nối khi gửi dữ liệu lên GitHub: ${errorMsg}`,
    };
  }
}
