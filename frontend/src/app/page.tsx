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
        setError("Unable to load dashboard data. Check backend server.");
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
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">Real-time market disclosure intelligence</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[12px] text-muted-foreground/60 mt-0.5">Real-time market disclosure intelligence</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      <SummaryCards
        watchlistCount={data?.watchlist_count ?? 0}
        todayDisclosures={data?.today_disclosures ?? 0}
        bullish={data?.bullish ?? 0}
        bearish={data?.bearish ?? 0}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ImportantDisclosures
          disclosures={data?.important_disclosures ?? []}
        />
        <RecentTimeline disclosures={data?.recent_disclosures ?? []} />
      </div>
    </div>
  );
}
