import { getToken, removeToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    removeToken();
    const path = window.location.pathname;
    if (path !== "/login" && !path.startsWith("/auth/")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // 기업 검색
  searchCorps: (q: string) =>
    request<{ results: Corp[] }>(`/api/corps/search?q=${encodeURIComponent(q)}`),

  // 관심종목
  getWatchlist: () => request<{ watchlist: WatchlistItem[] }>("/api/watchlist"),
  addToWatchlist: (item: { corp_code: string; corp_name: string; stock_code: string }) =>
    request<{ watchlist: WatchlistItem[] }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  removeFromWatchlist: (corpCode: string) =>
    request<{ watchlist: WatchlistItem[] }>(`/api/watchlist/${corpCode}`, {
      method: "DELETE",
    }),

  // 공시
  getDisclosures: (params?: { days?: number; category?: string; min_score?: number }) => {
    const sp = new URLSearchParams();
    if (params?.days) sp.set("days", String(params.days));
    if (params?.category) sp.set("category", params.category);
    if (params?.min_score) sp.set("min_score", String(params.min_score));
    const qs = sp.toString();
    return request<{ disclosures: Disclosure[]; total: number; pending_analysis: number }>(
      `/api/disclosures${qs ? `?${qs}` : ""}`
    );
  },

  // 대시보드
  getDashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),

  // 설정
  getSettings: () => request<AppSettings>("/api/settings"),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  // 북마크
  getBookmarks: () => request<{ bookmarks: Bookmark[] }>("/api/bookmarks"),
  addBookmark: (item: { rcept_no: string; corp_name: string; report_nm: string; memo?: string }) =>
    request<{ bookmarks: Bookmark[] }>("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  removeBookmark: (rceptNo: string) =>
    request<{ bookmarks: Bookmark[] }>(`/api/bookmarks/${rceptNo}`, {
      method: "DELETE",
    }),
  updateBookmarkMemo: (rceptNo: string, memo: string) =>
    request<{ bookmarks: Bookmark[] }>(`/api/bookmarks/${rceptNo}/memo`, {
      method: "PATCH",
      body: JSON.stringify({ memo }),
    }),

  // 공시 카운트
  getDisclosureCount: (since?: string) => {
    const qs = since ? `?since=${since}` : "";
    return request<{ count: number }>(`/api/disclosures/count${qs}`);
  },

  // 히스토리
  getDisclosureHistory: (days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return request<{ history: HistoryDataPoint[] }>(`/api/dashboard/history${qs}`);
  },

  // 유사 공시
  getSimilarDisclosures: (rceptNo: string, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : "";
    return request<{ similar: SimilarDisclosure[] }>(`/api/disclosures/${rceptNo}/similar${qs}`);
  },

  // 인증
  getMe: () => request<AuthUser>("/api/auth/me"),
};

// Types
export interface Corp {
  corp_code: string;
  corp_name: string;
  stock_code: string;
}

export interface WatchlistItem {
  corp_code: string;
  corp_name: string;
  stock_code: string;
}

export interface DisclosureAnalysis {
  category: string;
  importance_score: number;
  summary: string;
  action_item: string;
}

export interface Disclosure {
  rcept_no: string;
  rcept_dt: string;
  corp_name: string;
  corp_code: string;
  report_nm: string;
  flr_nm: string;
  _watchlist_name: string;
  analysis: DisclosureAnalysis | null;
}

export interface DashboardSummary {
  watchlist_count: number;
  today_disclosures: number;
  bullish: number;
  bearish: number;
  important_disclosures: Disclosure[];
  recent_disclosures: Disclosure[];
}

export interface AppSettings {
  telegram_enabled: boolean;
  telegram_chat_id: string;
  min_importance_score: number;
  categories: string[];
  alert_categories: string[];
  disclosure_days: number;
  alert_keywords: string[];
}

export interface Bookmark {
  rcept_no: string;
  corp_name: string;
  report_nm: string;
  memo: string;
  created_at: string;
}

export interface HistoryDataPoint {
  date: string;
  count: number;
  avg_score: number;
  bullish: number;
  bearish: number;
}

export interface SimilarDisclosure {
  rcept_no: string;
  corp_name: string;
  report_nm: string;
  rcept_dt: string;
  category: string;
  importance_score: number;
  summary: string;
}

export interface AuthUser {
  id: number;
  nickname: string;
  profile_image: string;
}
