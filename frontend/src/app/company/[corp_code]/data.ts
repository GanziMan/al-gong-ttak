import { cache } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DIVIDEND_CACHE_VERSION = "v2";

async function fetchJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const getCompanySummary = cache(async (corpCode: string) =>
  fetchJson<{
    company: {
      corp_name: string;
      corp_name_eng: string;
      stock_code: string;
      ceo_nm: string;
      induty_code: string;
      est_dt: string;
      hm_url: string;
    };
    financials: Array<{ year: string; accounts: Array<{ account: string; amount: number; amount_raw: string }> }>;
    dividends: Array<{ year: string; dividends: Array<Record<string, string>> }>;
    shareholders: Array<{ name: string; relation: string; shares_raw: string; ownership_pct: string }>;
  }>(`/api/company/${corpCode}/summary`, 86400)
);

export const getCompanyDividendCalendar = cache(async (corpCode: string) =>
  fetchJson<{
    event: {
      corp_code: string;
      corp_name: string;
      stock_code: string;
      status: "confirmed" | "expected" | "unknown";
      event_type: "record_date";
      next_event_date: string;
      recent_dps: number;
      recent_dps_raw: string;
      yield_pct: number | null;
      payout_pct: number | null;
      change_vs_prev_year: "increase" | "flat" | "decrease" | "no_dividend" | "new" | "unknown";
      source_year: string;
      reference_date: string;
      last_confirmed_record_date: string;
      previous_year_record_date: string;
      record_date_history: Array<{
        record_date: string;
        year: string;
        report_nm: string;
        rcept_dt: string;
      }>;
      payout_frequency_per_year: number | null;
      payout_cycle_label: string;
      note: string;
    } | null;
  }>(`/api/dividends/calendar/${corpCode}?v=${DIVIDEND_CACHE_VERSION}`, 300)
);

export const getCompanyStockPrices = cache(async (corpCode: string) =>
  fetchJson<{
    prices: Array<{
      date: string;
      close: number;
      open: number;
      high: number;
      low: number;
      volume: number;
      change: number;
    }>;
  }>(`/api/company/${corpCode}/stock-price?days=30`, 21600)
);
