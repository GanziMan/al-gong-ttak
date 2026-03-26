"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { DisclosureFilters } from "@/components/disclosure-filters";
import { DisclosureCard } from "@/components/disclosure-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { EmptyState } from "@/components/empty-state";
import { FileText, Star } from "lucide-react";
import { api, fetchWithRevalidate, getCached, Bookmark, Disclosure } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

interface DisclosuresClientProps {
  initialDisclosures: Disclosure[];
}

function DisclosuresContent({ initialDisclosures }: DisclosuresClientProps) {
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPendingRef = useRef(0);
  const bookmarkOps = useRef(0);

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
    if (!isLoggedIn) {
      // 특정 종목 조회 시에는 ISR 데이터 대신 API에서 직접 가져오기
      if (!corpCode && initialDisclosures.length > 0) {
        if (!isPolling) {
          setDisclosures(initialDisclosures);
          setPendingAnalysis(0);
          setLoading(false);
        }
        return;
      }

      if (!isPolling) {
        try {
          const data = await api.getPublicDisclosures({
            days: corpCode ? 30 : days,
            category: category === "all" ? undefined : category,
            min_score: minScore || undefined,
            corp_code: corpCode || undefined,
          });
          setDisclosures(data.disclosures);
          setPendingAnalysis(data.pending_analysis);
          setError("");
        } catch {
          setError("공시 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    if (!isPolling) {
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
            setDisclosures(fresh.disclosures);
            setPendingAnalysis(fresh.pending_analysis);
          },
          `disclosures_${days}_${category}_${minScore}`,
        );
        if (cached) {
          setDisclosures(cached.disclosures);
          setPendingAnalysis(cached.pending_analysis);
        }
        setError("");
      } catch {
        setError("공시 데이터를 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
      } finally {
        setLoading(false);
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
        setError("");
      } catch {
        // 폴링 실패는 무시
      }
    }
  }, [days, category, minScore, isLoggedIn, initialDisclosures]);

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
      pollRef.current = setInterval(() => fetchDisclosures(true), 5000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pendingAnalysis, fetchDisclosures, isLoggedIn]);

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
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
          filtered.map((d) => (
            <DisclosureCard
              key={d.rcept_no}
              disclosure={d}
              isBookmarked={bookmarks.some((b) => b.rcept_no === d.rcept_no)}
              onToggleBookmark={async (disc) => {
                if (!isLoggedIn) {
                  toast("로그인하면 북마크를 저장할 수 있어요", {
                    action: {
                      label: "로그인",
                      onClick: () => { window.location.href = "/login"; },
                    },
                  });
                  return;
                }
                const exists = bookmarks.some((b) => b.rcept_no === disc.rcept_no);
                if (exists) {
                  setBookmarks((prev) => prev.filter((b) => b.rcept_no !== disc.rcept_no));
                } else {
                  setBookmarks((prev) => [...prev, { rcept_no: disc.rcept_no, corp_name: disc.corp_name, report_nm: disc.report_nm, memo: "", created_at: "" }]);
                }
                bookmarkOps.current++;
                try {
                  const res = exists
                    ? await api.removeBookmark(disc.rcept_no)
                    : await api.addBookmark({
                        rcept_no: disc.rcept_no,
                        corp_name: disc.corp_name,
                        report_nm: disc.report_nm,
                      });
                  bookmarkOps.current--;
                  if (bookmarkOps.current === 0) setBookmarks(res.bookmarks);
                } catch {
                  bookmarkOps.current--;
                  toast.error(exists ? "북마크 해제 실패" : "북마크 추가 실패");
                }
              }}
            />
          ))
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
