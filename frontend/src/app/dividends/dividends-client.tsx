"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DividendCalendar } from "@/components/dividend-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { api, DividendCalendarEvent, WatchlistItem, getCached, setCache, isFresh } from "@/lib/api";

interface DividendsClientProps {
  initialPublicEvents: DividendCalendarEvent[];
}

const OVERVIEW_CACHE_KEY = "/api/watchlist/overview?dividend_cache=v2";

export function DividendsClient({ initialPublicEvents }: DividendsClientProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const cachedOverview = getCached<{ watchlist: WatchlistItem[]; dividend_events: DividendCalendarEvent[] }>(OVERVIEW_CACHE_KEY);

  const [watchlistEvents, setWatchlistEvents] = useState<DividendCalendarEvent[]>(cachedOverview?.dividend_events ?? []);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(cachedOverview?.watchlist ?? []);
  const [loading, setLoading] = useState(isLoggedIn && !cachedOverview);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }

    if (cachedOverview && isFresh(OVERVIEW_CACHE_KEY)) {
      setWatchlistEvents(cachedOverview.dividend_events);
      setWatchlist(cachedOverview.watchlist);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    async function loadOverview() {
      setLoading(true);
      try {
        const data = await api.getWatchlistOverview();
        if (cancelled) return;
        setWatchlistEvents(data.dividend_events);
        setWatchlist(data.watchlist);
        setCache(OVERVIEW_CACHE_KEY, data);
        setError("");
      } catch {
        if (!cancelled) setError("관심종목 배당 일정을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [cachedOverview, isLoading, isLoggedIn]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">배당 일정</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          공개 배당 일정은 누구나 볼 수 있고, 로그인하면 내 관심종목 기준 배당 흐름도 함께 확인할 수 있습니다.
        </p>
      </div>

      {isLoggedIn && (
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground">내 종목 보기</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            관심종목 {watchlist.length}개 기준 배당 일정
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            관심종목을 등록하면 공시와 배당 흐름을 내 종목 기준으로 바로 볼 수 있습니다.
          </p>
          <div className="mt-3">
            <Link
              href="/watchlist"
              className="text-[12px] font-medium text-primary hover:underline"
            >
              관심종목 관리하기 →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoggedIn && (loading || isLoading) ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : isLoggedIn && watchlistEvents.length > 0 ? (
        <DividendCalendar
          events={watchlistEvents}
          title="관심종목 배당 일정"
          description="로그인 사용자는 관심종목 기준 배당 기준일과 배당 변화를 먼저 확인할 수 있습니다."
          emptyMessage="관심종목이 없거나 배당 데이터를 만들 수 있는 종목이 아직 없습니다."
        />
      ) : null}

      <DividendCalendar
        events={initialPublicEvents}
        title="공개 배당 일정"
        description="인기 종목 기준 공개 배당 일정 6개를 먼저 보여줍니다."
        emptyMessage="공개 배당 일정 데이터가 아직 준비되지 않았습니다."
        countLabel="공개 6개 종목"
      />
    </div>
  );
}
