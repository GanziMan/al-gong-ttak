"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { DisclosureFilters } from "@/components/disclosure-filters";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { EmptyState } from "@/components/empty-state";
import { FileText, Star } from "lucide-react";
import { ApiError, api, fetchWithRevalidate, getCached, Bookmark, Disclosure } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

interface DisclosuresClientProps {
  initialDisclosures: Disclosure[];
  initialPendingAnalysis?: number;
}

function DisclosuresContent({ initialDisclosures, initialPendingAnalysis = 0 }: DisclosuresClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const corpCode = searchParams.get("corp_code");
  const corpNameParam = searchParams.get("corp_name");
  const { isLoggedIn } = useAuth();

  const [disclosures, setDisclosures] = useState<Disclosure[]>(() => {
    if (initialDisclosures.length > 0) return initialDisclosures;
    const cached = getCached<{ disclosures: Disclosure[] }>("disclosures_7_all_0");
    return cached?.disclosures ?? [];
  });
  const [loading, setLoading] = useState(() => {
    if (initialDisclosures.length > 0) return false;
    return !getCached("disclosures_7_all_0");
  });
  const [error, setError] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [days, setDays] = useState(Number(searchParams.get("days")) || 7);
  const [minScore, setMinScore] = useState(Number(searchParams.get("min_score")) || 0);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);
  const [filtering, setFiltering] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const canUseInitialPublicData =
    !corpCode &&
    !isLoggedIn &&
    category === "all" &&
    days === 30 &&
    minScore === 0 &&
    initialDisclosures.length > 0;
  const requestSeqRef = useRef(0);
  const bookmarksRef = useRef<Bookmark[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelayRef = useRef(5000);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const prevPendingRef = useRef(0);
  const bookmarkQueueRef = useRef<Promise<void>>(Promise.resolve());

  const toErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      return `${fallback} (HTTP ${err.status})`;
    }
    return fallback;
  }, []);

  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  // 비로그인: ISR 데이터를 날짜로 필터링 (KST 기준)
  const filterByDays = useCallback((data: Disclosure[], d: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - d);
    const y = cutoff.getFullYear();
    const m = String(cutoff.getMonth() + 1).padStart(2, "0");
    const day = String(cutoff.getDate()).padStart(2, "0");
    const cutoffStr = `${y}${m}${day}`;
    return data.filter((disc) => disc.rcept_dt >= cutoffStr);
  }, []);

  const updateURL = useCallback((newCat: string, newDays: number, newScore: number) => {
    const params = new URLSearchParams();
    if (corpCode) params.set("corp_code", corpCode);
    if (corpNameParam) params.set("corp_name", corpNameParam);
    if (newCat !== "all") params.set("category", newCat);
    if (newDays !== 7) params.set("days", String(newDays));
    if (newScore > 0) params.set("min_score", String(newScore));
    const qs = params.toString();
    router.replace(qs ? `/disclosures?${qs}` : "/disclosures");
  }, [router, corpCode, corpNameParam]);

  const handleCategoryChange = useCallback((v: string) => {
    setCategory(v);
    updateURL(v, days, minScore);
  }, [days, minScore, updateURL]);

  const handleDaysChange = useCallback((v: number) => {
    setDays(v);
    updateURL(category, v, minScore);
  }, [category, minScore, updateURL]);

  const handleMinScoreChange = useCallback((v: number) => {
    setMinScore(v);
    updateURL(category, days, v);
  }, [category, days, updateURL]);

  const fetchDisclosures = useCallback(async (isPolling = false) => {
    const reqId = isPolling ? requestSeqRef.current : ++requestSeqRef.current;
    const isStale = () => !isPolling && reqId !== requestSeqRef.current;

    // 특정 종목 검색: 로그인 여부와 상관없이 public API 사용
    if (corpCode) {
      if (!isPolling) {
        setFiltering(true);
        try {
          const data = await api.getPublicDisclosures({
            days: 30,
            category: category === "all" ? undefined : category,
            min_score: minScore || undefined,
            corp_code: corpCode,
          });
          if (isStale()) return;
          setDisclosures(data.disclosures);
          setPendingAnalysis(data.pending_analysis);
          setError("");
        } catch (err) {
          if (isStale()) return;
          setError(toErrorMessage(err, "공시 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요."));
        } finally {
          if (isStale()) return;
          setLoading(false);
          setFiltering(false);
        }
      }
      return;
    }

    if (!isLoggedIn) {
      if (canUseInitialPublicData) {
        if (!isPolling) {
          if (isStale()) return;
          setDisclosures(initialDisclosures);
          setPendingAnalysis(initialPendingAnalysis);
          setLoading(false);
          setError("");
        }
        return;
      }

      if (!isPolling) {
        try {
          const data = await api.getPublicDisclosures({
            days,
            category: category === "all" ? undefined : category,
            min_score: minScore || undefined,
          });
          if (isStale()) return;
          setDisclosures(data.disclosures);
          setPendingAnalysis(data.pending_analysis);
          setError("");
        } catch (err) {
          if (isStale()) return;
          setError(toErrorMessage(err, "공시 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요."));
        } finally {
          if (isStale()) return;
          setLoading(false);
        }
      }
      return;
    }

    if (!isPolling) {
      setFiltering(true);
      const sp = new URLSearchParams();
      if (days !== 7) sp.set("days", String(days));
      if (category !== "all") sp.set("category", category);
      if (minScore > 0) sp.set("min_score", String(minScore));
      const qs = sp.toString();
      const path = `/api/disclosures${qs ? `?${qs}` : ""}`;

      try {
        const cached = await fetchWithRevalidate<{ disclosures: Disclosure[]; total: number; pending_analysis: number }>(
          path,
          (fresh) => {
            if (isStale()) return;
            setDisclosures(fresh.disclosures);
            setPendingAnalysis(fresh.pending_analysis);
          },
          `disclosures_${days}_${category}_${minScore}`,
        );
        if (isStale()) return;
        if (cached) {
          setDisclosures(cached.disclosures);
          setPendingAnalysis(cached.pending_analysis);
        }
        setError("");
      } catch (err) {
        if (isStale()) return;
        setError(toErrorMessage(err, "공시 데이터를 불러올 수 없습니다. 백엔드 서버를 확인하세요."));
      } finally {
        if (isStale()) return;
        setLoading(false);
        setFiltering(false);
      }
    } else {
      try {
        const data = await api.getDisclosures({
          days,
          category: category === "all" ? undefined : category,
          min_score: minScore || undefined,
        });
        setDisclosures(data.disclosures);
        setPendingAnalysis(data.pending_analysis);
      } catch {
        // 폴링 실패는 무시
      }
    }
  }, [days, category, minScore, corpCode, isLoggedIn, initialDisclosures, initialPendingAnalysis, canUseInitialPublicData, toErrorMessage]);

  useEffect(() => {
    if (corpCode) setLoading(true);
    fetchDisclosures();
    const today = new Date();
    const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    localStorage.setItem("disclosures_last_seen", yyyymmdd);
    if (isLoggedIn) {
      api.getBookmarks().then((data) => setBookmarks(data.bookmarks)).catch(() => {});
    }
  }, [fetchDisclosures, isLoggedIn, corpCode]);

  // AI 분석 완료 감지
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingAnalysis === 0) {
      toast.success("AI 분석 완료");
    }
    prevPendingRef.current = pendingAnalysis;
  }, [pendingAnalysis]);

  // 미분석 건이 있으면 5초 간격으로 자동 폴링 (로그인 시에만)
  useEffect(() => {
    if (pendingAnalysis > 0 && isLoggedIn) {
      let cancelled = false;
      pollDelayRef.current = 5000;

      const tick = async () => {
        await fetchDisclosures(true);
        if (cancelled) return;
        const hidden = document.visibilityState !== "visible";
        const nextDelay = hidden
          ? Math.max(pollDelayRef.current, 20000)
          : Math.min(Math.round(pollDelayRef.current * 1.5), 30000);
        pollDelayRef.current = nextDelay;
        pollRef.current = setTimeout(tick, nextDelay);
      };

      pollRef.current = setTimeout(tick, pollDelayRef.current);

      return () => {
        cancelled = true;
        if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }
      };
    }

    return undefined;
  }, [pendingAnalysis, fetchDisclosures, isLoggedIn]);

  const handleToggleBookmark = useCallback((disc: Disclosure, isBookmarkedNow: boolean) => {
    if (!isLoggedIn) {
      toast("로그인하면 북마크를 저장할 수 있어요", {
        action: {
          label: "로그인",
          onClick: () => { window.location.href = "/login"; },
        },
      });
      return;
    }

    if (isBookmarkedNow) {
      setBookmarks((prev) => prev.filter((b) => b.rcept_no !== disc.rcept_no));
    } else {
      setBookmarks((prev) => [
        ...prev,
        {
          rcept_no: disc.rcept_no,
          corp_name: disc.corp_name,
          report_nm: disc.report_nm,
          memo: "",
          created_at: "",
        },
      ]);
    }

    bookmarkQueueRef.current = bookmarkQueueRef.current
      .then(async () => {
        const res = isBookmarkedNow
          ? await api.removeBookmark(disc.rcept_no)
          : await api.addBookmark({
              rcept_no: disc.rcept_no,
              corp_name: disc.corp_name,
              report_nm: disc.report_nm,
            });
        setBookmarks(res.bookmarks);
      })
      .catch(async () => {
        toast.error(isBookmarkedNow ? "북마크 해제 실패" : "북마크 추가 실패");
        try {
          const latest = await api.getBookmarks();
          setBookmarks(latest.bookmarks);
        } catch {
          // silent
        }
      });
  }, [isLoggedIn]);

  // 비로그인: 클라이언트 사이드 필터링 (날짜/카테고리/점수)
  const filtered = useMemo(() => {
    let result = disclosures;

    if (!isLoggedIn) {
      result = filterByDays(result, days);
      if (category !== "all") {
        result = result.filter((d) => d.analysis?.category === category);
      }
      if (minScore > 0) {
        result = result.filter((d) => (d.analysis?.importance_score ?? 0) >= minScore);
      }
    }

    if (corpCode) {
      result = result.filter((d) => d.corp_code === corpCode);
    }

    return result;
  }, [disclosures, days, category, minScore, corpCode, isLoggedIn, filterByDays]);

  const corpName = corpCode
    ? corpNameParam || disclosures.find((d) => d.corp_code === corpCode)?.corp_name || corpCode
    : null;

  const handleRefresh = async () => {
    await fetchDisclosures(true);
    toast.success("새로고침 완료");
  };

  // 에러 + 빈 데이터 상태면 자동 재시도 (백오프)
  useEffect(() => {
    const shouldRetry = !!error && !loading && filtered.length === 0;
    if (!shouldRetry) {
      retryCountRef.current = 0;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      return;
    }

    const delay = Math.min(2000 * (2 ** retryCountRef.current), 15000);
    retryRef.current = setTimeout(() => {
      retryCountRef.current += 1;
      fetchDisclosures(false);
    }, delay);

    return () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [error, loading, filtered.length, fetchDisclosures]);

  // 탭 복귀/네트워크 복구 시 재요청
  useEffect(() => {
    const shouldRecover = () => !!error && !loading && filtered.length === 0;
    const recover = () => {
      if (shouldRecover()) fetchDisclosures(false);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") recover();
    };

    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [error, loading, filtered.length, fetchDisclosures]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {corpCode ? (
            <>
              <Link
                href="/disclosures"
                className="text-[12px] text-primary hover:underline"
              >
                &larr; 전체 공시
              </Link>
              <h1 className="text-2xl font-bold tracking-tight mt-1">
                {corpName} 공시
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                해당 종목의 AI 분석 공시
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">공시</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {isLoggedIn ? "관심종목의 AI 분석 공시" : "전체 AI 분석 공시"}
              </p>
              {pendingAnalysis > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-primary font-medium">
                    AI 분석 중... ({pendingAnalysis}건 남음)
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        <DisclosureFilters
          category={category}
          days={days}
          minScore={minScore}
          onCategoryChange={handleCategoryChange}
          onDaysChange={handleDaysChange}
          onMinScoreChange={handleMinScoreChange}
        />
      </div>

      {error && filtered.length === 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchDisclosures(false)}
              className="shrink-0 rounded-md border border-red-300/70 px-2 py-1 text-[11px] font-semibold hover:bg-red-100/70 dark:border-red-700 dark:hover:bg-red-900/40"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      <div className={cn("space-y-3 transition-opacity duration-200", filtering && "opacity-50 pointer-events-none")}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={corpCode ? FileText : (isLoggedIn ? Star : FileText)}
            title={corpCode ? "해당 종목의 공시가 없습니다" : "공시가 없습니다"}
            description={
              corpCode
                ? "기간이나 필터를 조정해 보세요"
                : isLoggedIn
                  ? "관심종목을 추가하거나 필터를 조정하세요"
                  : "필터를 조정하거나 나중에 다시 시도해 보세요"
            }
            action={!corpCode && isLoggedIn ? {
              label: "관심종목 추가하기",
              onClick: () => window.location.href = "/watchlist"
            } : undefined}
          />
        ) : (
          filtered.map((d) => {
            const isBookmarked = bookmarks.some((b) => b.rcept_no === d.rcept_no);
            return (
              <DisclosureCard
                key={d.rcept_no}
                disclosure={d}
                isBookmarked={isBookmarked}
                onToggleBookmark={(disc) => handleToggleBookmark(disc, isBookmarked)}
              />
            );
          })
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground/50">
          총 {filtered.length}건
        </p>
      )}
    </div>
    </PullToRefresh>
  );
}

export function DisclosuresClient({ initialDisclosures }: DisclosuresClientProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <div className="h-7 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse mt-1" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <DisclosuresContent initialDisclosures={initialDisclosures} />
    </Suspense>
  );
}
