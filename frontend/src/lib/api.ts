const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
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
}
