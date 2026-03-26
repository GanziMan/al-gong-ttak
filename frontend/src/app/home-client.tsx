"use client";

import { useState, useEffect } from "react";
import { SummaryCards } from "@/components/summary-cards";
import {
  ImportantDisclosures,
  RecentTimeline,
} from "@/components/important-disclosures";
import { DisclosureHistoryChart } from "@/components/disclosure-history-chart";
import { BookmarksSection } from "@/components/bookmarks-section";
import { DailyBriefing } from "@/components/daily-briefing";
import { Landing } from "@/components/landing";
import { Skeleton } from "@/components/ui/skeleton";
import { api, fetchWithRevalidate, getCached, DashboardSummary, Disclosure } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(() => getCached<DashboardSummary>("/api/dashboard/summary"));
  const [loading, setLoading] = useState(() => !getCached("/api/dashboard/summary"));
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const cached = await fetchWithRevalidate<DashboardSummary>(
          "/api/dashboard/summary",
          (fresh) => setData(fresh),
        );
        if (cached) setData(cached);
      } catch {
        setError("대시보드 데이터를 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">실시간 공시 분석 현황</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">실시간 공시 분석 현황</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <DailyBriefing />

      <SummaryCards
        watchlistCount={data?.watchlist_count ?? 0}
        todayDisclosures={data?.today_disclosures ?? 0}
        bullish={data?.bullish ?? 0}
        bearish={data?.bearish ?? 0}
      />

      <DisclosureHistoryChart />

      <div className="grid gap-4 lg:grid-cols-2">
        <ImportantDisclosures
          disclosures={data?.important_disclosures ?? []}
        />
        <RecentTimeline disclosures={data?.recent_disclosures ?? []} />
      </div>

      <BookmarksSection />
    </div>
  );
}

interface HomeClientProps {
  summary?: DashboardSummary | null;
  disclosures?: Disclosure[];
}

export function HomeClient({ summary, disclosures }: HomeClientProps = {}) {
  const { isLoggedIn, isLoading } = useAuth();

  // 로딩 중이더라도 SSG 데이터가 있으면 Landing을 바로 보여줌 (비로그인 유저 UX)
  // 로그인 유저로 확인되면 Dashboard로 전환
  if (isLoading) {
    // SSG 데이터가 있으면 Landing을 먼저 표시 (hydration flicker 방지)
    if (summary || (disclosures && disclosures.length > 0)) {
      return <Landing summary={summary} disclosures={disclosures} />;
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Landing summary={summary} disclosures={disclosures} />;
  }

  return <Dashboard />;
}
