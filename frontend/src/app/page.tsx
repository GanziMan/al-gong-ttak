"use client";

import { useState, useEffect } from "react";
import { SummaryCards } from "@/components/summary-cards";
import {
  ImportantDisclosures,
  RecentTimeline,
} from "@/components/important-disclosures";
import { Skeleton } from "@/components/ui/skeleton";
import { api, DashboardSummary } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const summary = await api.getDashboardSummary();
        setData(summary);
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
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryCards
        watchlistCount={data?.watchlist_count ?? 0}
        todayDisclosures={data?.today_disclosures ?? 0}
        bullish={data?.bullish ?? 0}
        bearish={data?.bearish ?? 0}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ImportantDisclosures
          disclosures={data?.important_disclosures ?? []}
        />
        <RecentTimeline disclosures={data?.recent_disclosures ?? []} />
      </div>
    </div>
  );
}
