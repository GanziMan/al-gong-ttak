"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  const [events, setEvents] = useState<DividendCalendarEvent[]>(
    isLoggedIn ? (cachedOverview?.dividend_events ?? []) : initialPublicEvents,
  );
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(cachedOverview?.watchlist ?? []);
  const [loading, setLoading] = useState(isLoggedIn && !cachedOverview);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      setEvents(initialPublicEvents);
      setLoading(false);
      setError("");
      return;
    }

    if (cachedOverview && isFresh(OVERVIEW_CACHE_KEY)) {
      setEvents(cachedOverview.dividend_events);
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
        setEvents(data.dividend_events);
        setWatchlist(data.watchlist);
        setCache(OVERVIEW_CACHE_KEY, data);
        setError("");
      } catch {
        if (cancelled) return;
        setError("배당 일정을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [cachedOverview, initialPublicEvents, isLoading, isLoggedIn]);

  const header = useMemo(() => {
    if (isLoggedIn) {
      return {
        eyebrow: "로그인 사용자",
        title: "내 관심종목 배당 일정",
        description: "관심종목 기준 최근 배당 기준일과 배당 변화를 모아서 봅니다.",
      };
    }
    return {
      eyebrow: "비로그인 사용자",
      title: "공개 배당 일정",
      description: "인기 종목 기준 최근 배당 기준일과 배당 흐름을 먼저 확인할 수 있습니다.",
    };
  }, [isLoggedIn]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
          {header.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{header.title}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{header.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground">현재 기준</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {isLoggedIn ? `관심종목 ${watchlist.length}개` : "인기 종목 미리보기"}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {isLoggedIn
              ? "로그인 사용자는 관심종목 기준으로 배당 흐름이 자동 반영됩니다."
              : "비로그인 사용자도 공개 배당 일정을 확인할 수 있습니다."}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground">바로가기</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {isLoggedIn ? "관심종목과 함께 보기" : "로그인하면 내 종목 기준으로"}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {isLoggedIn
              ? "관심종목 추가 후 공시와 배당 흐름을 함께 볼 수 있습니다."
              : "내 종목만 따로 보고 싶다면 로그인 후 관심종목을 추가하세요."}
          </p>
          <div className="mt-3">
            <Link
              href={isLoggedIn ? "/watchlist" : "/login"}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              {isLoggedIn ? "관심종목 관리하기 →" : "로그인하고 내 종목 보기 →"}
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading || isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <DividendCalendar
          events={events}
          title={isLoggedIn ? "관심종목 배당 일정" : "공개 배당 일정"}
          description={
            isLoggedIn
              ? "로그인 사용자는 관심종목 기준 배당 기준일과 배당 변화를 확인할 수 있습니다."
              : "비로그인 사용자는 인기 종목 기준 배당 기준일과 배당 흐름을 볼 수 있습니다."
          }
          emptyMessage={
            isLoggedIn
              ? "관심종목이 없거나 배당 데이터를 만들 수 있는 종목이 아직 없습니다."
              : "공개 배당 일정 데이터가 아직 준비되지 않았습니다."
          }
        />
      )}
    </div>
  );
}
