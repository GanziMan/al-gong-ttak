import { getToken, signOut } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- SWR-style localStorage cache ---
const CACHE_PREFIX = "api_cache:";
const CACHE_TTL = 5 * 60 * 1000; // 5분

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // TTL 지나도 stale 데이터는 반환 (revalidate 중 표시용)
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full 등 무시
  }
}

function isFresh(key: string): boolean {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return Date.now() - entry.ts < CACHE_TTL;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    await signOut();
    const currentPath = window.location.pathname;
    if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

/** GET 요청에 대해 캐시된 데이터를 즉시 반환하고 백그라운드에서 revalidate */
async function cachedGet<T>(path: string, cacheKey?: string): Promise<T> {
  const key = cacheKey || path;
  const cached = getCached<T>(key);

  if (cached && isFresh(key)) {
    return cached;
  }

  if (cached) {
    // stale 데이터 즉시 반환, 백그라운드에서 갱신
    request<T>(path).then((fresh) => setCache(key, fresh)).catch(() => {});
    return cached;
  }

  // 캐시 없으면 네트워크 요청
  const data = await request<T>(path);
  setCache(key, data);
  return data;
}

/** GET 요청 + 강제 revalidate (캐시 먼저 반환 후 콜백으로 새 데이터 전달) */
export async function fetchWithRevalidate<T>(
  path: string,
  onUpdate: (data: T) => void,
  cacheKey?: string,
): Promise<T | null> {
  const key = cacheKey || path;
  const cached = getCached<T>(key);

  // 캐시 있으면 즉시 반환
  if (cached) {
    // 백그라운드에서 새 데이터 가져와서 콜백
    request<T>(path).then((fresh) => {
      setCache(key, fresh);
      onUpdate(fresh);
    }).catch(() => {});
    return cached;
  }

  // 캐시 없으면 기다림
  const data = await request<T>(path);
  setCache(key, data);
  return data;
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

  getPublicDisclosures: (params?: { days?: number; category?: string; min_score?: number }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.category && params.category !== "all") q.set("category", params.category);
    if (params?.min_score) q.set("min_score", String(params.min_score));
    const qs = q.toString();
    return request<{ disclosures: Disclosure[]; total: number; pending_analysis: number }>(
      `/api/disclosures/public${qs ? `?${qs}` : ""}`
    );
  },

  // 대시보드
  getDashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),

  getPublicDashboard: () =>
    request<DashboardSummary>("/api/dashboard/public"),

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
    return request<{ similar: SimilarDisclosure[]; avg_price_change: number | null }>(`/api/disclosures/${rceptNo}/similar${qs}`);
  },

  // 주가
  getStockPrices: (corpCode: string, days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return request<{ prices: StockPriceDay[] }>(`/api/company/${corpCode}/stock-price${qs}`);
  },

  // 주가 영향
  getPriceImpact: (rceptNo: string) =>
    request<{ impact: PriceImpact | null }>(`/api/disclosures/${rceptNo}/price-impact`),

  // 기업 재무
  getCompanySummary: (corpCode: string) =>
    request<CompanySummary>(`/api/company/${corpCode}/summary`),
  getCompanyFinancials: (corpCode: string, years?: number) => {
    const qs = years ? `?years=${years}` : "";
    return request<{ financials: FinancialYear[] }>(`/api/company/${corpCode}/financials${qs}`);
  },
  getCompanyDividends: (corpCode: string, years?: number) => {
    const qs = years ? `?years=${years}` : "";
    return request<{ dividends: DividendYear[] }>(`/api/company/${corpCode}/dividends${qs}`);
  },
  getCompanyShareholders: (corpCode: string) =>
    request<{ shareholders: ShareholderInfo[] }>(`/api/company/${corpCode}/shareholders`),

  // 브리핑
  getDailyBriefing: () => request<DailyBriefing>("/api/briefing/daily"),

  // 인기 종목
  getPopularStocks: (limit?: number) => {
    const qs = limit ? `?limit=${limit}` : "";
    return request<{ stocks: PopularStock[] }>(`/api/corps/popular${qs}`);
  },

  // 업종
  getSectors: () => request<{ sectors: SectorInfo[] }>("/api/corps/sectors"),

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
  price_change_5d: number | null;
}

// 기업 재무 데이터
export interface FinancialAccount {
  account: string;
  amount: number;
  amount_raw: string;
}

export interface FinancialYear {
  year: string;
  accounts: FinancialAccount[];
}

export interface DividendYear {
  year: string;
  dividends: Array<Record<string, string>>;
}

export interface ShareholderInfo {
  name: string;
  relation: string;
  shares_raw: string;
  ownership_pct: string;
}

export interface CompanyInfo {
  corp_name: string;
  corp_name_eng: string;
  stock_code: string;
  ceo_nm: string;
  induty_code: string;
  est_dt: string;
  hm_url: string;
}

export interface CompanySummary {
  company: CompanyInfo;
  financials: FinancialYear[];
  dividends: DividendYear[];
  shareholders: ShareholderInfo[];
}

export interface AuthUser {
  id: number;
  nickname: string;
  profile_image: string;
}

export interface PopularStock {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  watchers: number;
}

export interface SectorCorp {
  corp_code: string;
  corp_name: string;
  stock_code: string;
}

export interface SectorInfo {
  name: string;
  corps: SectorCorp[];
}

export interface DailyBriefing {
  date: string;
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  top_disclosures: Array<{
    corp_name: string;
    report_nm: string;
    category: string;
    importance_score: number;
  }>;
  narrative: string;
}

export interface StockPriceDay {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
}

export interface PriceImpact {
  before_price: number;
  after_price: number;
  change_1d: number | null;
  change_3d: number | null;
  change_5d: number | null;
  prices: StockPriceDay[];
}
