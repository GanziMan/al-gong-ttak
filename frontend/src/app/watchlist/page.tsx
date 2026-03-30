"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { StockSearch } from "@/components/stock-search";
import { WatchlistTable } from "@/components/watchlist-table";
import { PopularStocks } from "@/components/popular-stocks";
import { SectorAdd } from "@/components/sector-add";
import { DividendCalendar } from "@/components/dividend-calendar";
import { api, getCached, setCache, isFresh, Corp, DividendCalendarEvent, WatchlistItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const CACHE_KEY = "/api/watchlist/overview";
  const cached = getCached<{ watchlist: WatchlistItem[]; dividend_events: DividendCalendarEvent[] }>(CACHE_KEY);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(cached?.watchlist ?? []);
  const [dividendEvents, setDividendEvents] = useState<DividendCalendarEvent[]>(cached?.dividend_events ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getWatchlistOverview();
      setWatchlist(data.watchlist);
      setDividendEvents(data.dividend_events);
      setCache(CACHE_KEY, data);
      setError("");
    } catch {
      setError("관심종목을 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cached && isFresh(CACHE_KEY)) {
      setLoading(false);
    } else {
      fetchOverview();
    }
  }, [cached, fetchOverview]);

  const existingCodes = useMemo(
    () => new Set(watchlist.map((w) => w.corp_code)),
    [watchlist],
  );

  async function handleAdd(corp: Corp) {
    // 이미 있으면 무시
    if (watchlist.some((w) => w.corp_code === corp.corp_code)) {
      toast.info(`${corp.corp_name}은(는) 이미 추가되어 있습니다.`);
      return;
    }

    // 낙관적 업데이트
    const optimistic: WatchlistItem = {
      corp_code: corp.corp_code,
      corp_name: corp.corp_name,
      stock_code: corp.stock_code,
    };
    const prev = watchlist;
    setWatchlist([...prev, optimistic]);
    toast.success(`${corp.corp_name} 추가됨`);

    try {
      const data = await api.addToWatchlist({
        corp_code: corp.corp_code,
        corp_name: corp.corp_name,
        stock_code: corp.stock_code,
      });
      setWatchlist(data.watchlist);
      fetchOverview();
    } catch {
      // 실패 시 롤백
      setWatchlist(prev);
      toast.error("종목 추가에 실패했습니다.");
    }
  }

  async function handleRemove(corpCode: string) {
    const name = watchlist.find((w) => w.corp_code === corpCode)?.corp_name ?? corpCode;

    // 낙관적 업데이트
    const prev = watchlist;
    setWatchlist(prev.filter((w) => w.corp_code !== corpCode));
    toast.success(`${name} 삭제됨`);

    try {
      const data = await api.removeFromWatchlist(corpCode);
      setWatchlist(data.watchlist);
      fetchOverview();
    } catch {
      // 실패 시 롤백
      setWatchlist(prev);
      toast.error("종목 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관심종목</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          관심 종목을 관리하세요
        </p>
      </div>

      <StockSearch onSelect={handleAdd} />

      <PopularStocks
        onAdd={handleAdd}
        existingCodes={existingCodes}
      />

      <SectorAdd
        onAdd={handleAdd}
        existingCodes={existingCodes}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <DividendCalendar events={dividendEvents} />
      )}

      {loading ? (
        <Skeleton className="h-52 rounded-2xl" />
      ) : (
        <WatchlistTable items={watchlist} onRemove={handleRemove} />
      )}
    </div>
  );
}
