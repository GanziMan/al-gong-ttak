import { cache } from "react";
import type { DashboardSummary, Disclosure, DisclosurePreview, DividendCalendarEvent } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DIVIDEND_CACHE_VERSION = "v2";

interface PublicDisclosuresResponse {
  disclosures: Disclosure[];
  total: number;
  pending_analysis?: number;
}

interface PublicDisclosurePreviewResponse {
  disclosures: DisclosurePreview[];
  total: number;
  pending_analysis?: number;
}

async function fetchJson<T>(path: string, revalidate: number): Promise<T | null> {
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

export const getPublicLandingData = cache(async (): Promise<{
  summary: DashboardSummary | null;
  disclosures: DisclosurePreview[];
  dividendEvents: DividendCalendarEvent[];
} | null> => {
  const [summary, disclosuresData, dividendData] = await Promise.all([
    fetchJson<DashboardSummary>("/api/dashboard/public", 300),
    fetchJson<PublicDisclosurePreviewResponse>("/api/disclosures/public/preview?days=3&limit=10", 300),
    fetchJson<{ events: DividendCalendarEvent[] }>(`/api/dividends/public/preview?limit=6&v=${DIVIDEND_CACHE_VERSION}`, 300),
  ]);

  if (!summary && !disclosuresData) {
    return null;
  }

  const disclosures = disclosuresData?.disclosures.slice(0, 10) ?? [];
  const dividendEvents = dividendData?.events ?? [];

  if (summary && disclosuresData) {
    return {
      summary: {
        ...summary,
        today_disclosures: disclosuresData.total,
        bullish: disclosuresData.disclosures.filter((d) => d.analysis?.category === "호재").length,
        bearish: disclosuresData.disclosures.filter((d) => d.analysis?.category === "악재").length,
      },
      disclosures,
      dividendEvents,
    };
  }

  return {
    summary: summary ?? null,
    disclosures,
    dividendEvents,
  };
});

export const getPublicDisclosuresData = cache(async (days: number): Promise<{
  disclosures: Disclosure[];
  pendingAnalysis: number;
} | null> => {
  const data = await fetchJson<PublicDisclosuresResponse>(`/api/disclosures/public?days=${days}`, 300);
  if (!data) return null;
  return {
    disclosures: data.disclosures,
    pendingAnalysis: data.pending_analysis ?? 0,
  };
});
