"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { DisclosureFilters } from "@/components/disclosure-filters";
import { DisclosureCard } from "@/components/disclosure-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, fetchWithRevalidate, Bookmark, Disclosure } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

function DisclosuresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const corpCode = searchParams.get("corp_code");
  const { isLoggedIn } = useAuth();

  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [days, setDays] = useState(Number(searchParams.get("days")) || 7);
  const [minScore, setMinScore] = useState(Number(searchParams.get("min_score")) || 0);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPendingRef = useRef(0);

  const updateURL = useCallback((newCat: string, newDays: number, newScore: number) => {
    const params = new URLSearchParams();
    if (newCat !== "all") params.set("category", newCat);
    if (newDays !== 7) params.set("days", String(newDays));
    if (newScore > 0) params.set("min_score", String(newScore));
    const qs = params.toString();
    router.replace(qs ? `/disclosures?${qs}` : "/disclosures");
  }, [router]);

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
    if (!isPolling) {
      // 비로그인: public API 호출
      if (!isLoggedIn) {
        try {
          const data = await api.getPublicDisclosures({
            days,
            category: category !== "all" ? category : undefined,
            min_score: minScore || undefined,
          });
          setDisclosures(data.disclosures);
          setPendingAnalysis(data.pending_analysis);
          setError("");
        } catch {
          setError("공시 데이터를 불러올 수 없습니다.");
        } finally {
          setLoading(false);
        }
        return;
      }

      // 첫 로딩 시 캐시에서 즉시 표시
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
      // 폴링 시에는 직접 fetch
      if (!isLoggedIn) {
        try {
          const data = await api.getPublicDisclosures({
            days,
            category: category !== "all" ? category : undefined,
            min_score: minScore || undefined,
          });
          setDisclosures(data.disclosures);
          setPendingAnalysis(data.pending_analysis);
          setError("");
        } catch {
          // 폴링 실패는 무시
        }
        return;
      }

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
  }, [days, category, minScore, isLoggedIn]);

  useEffect(() => {
    fetchDisclosures();
    // 마지막 방문 날짜 기록
    const today = new Date();
    const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    localStorage.setItem("disclosures_last_seen", yyyymmdd);
    // 북마크 로드
    if (isLoggedIn) {
      api.getBookmarks().then((data) => setBookmarks(data.bookmarks)).catch(() => {});
    }
  }, [fetchDisclosures, isLoggedIn]);

  // AI 분석 완료 감지
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingAnalysis === 0) {
      toast.success("AI 분석 완료");
    }
    prevPendingRef.current = pendingAnalysis;
  }, [pendingAnalysis]);

  // 미분석 건이 있으면 5초 간격으로 자동 폴링
  useEffect(() => {
    if (pendingAnalysis > 0) {
      pollRef.current = setInterval(() => fetchDisclosures(true), 5000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pendingAnalysis, fetchDisclosures]);

  const filtered = corpCode
    ? disclosures.filter((d) => d.corp_code === corpCode)
    : disclosures;

  // corp_name을 전체 목록에서 먼저 찾아서 필터 결과가 0건이어도 이름 표시
  const corpName = corpCode
    ? disclosures.find((d) => d.corp_code === corpCode)?.corp_name ?? null
    : null;

  return (
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
                {corpName ?? corpCode} 공시
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
          <div className="glass-card rounded-2xl border-dashed py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {corpCode ? "해당 종목의 공시가 없습니다" : "공시가 없습니다"}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/60">
              {corpCode
                ? "기간이나 필터를 조정해 보세요"
                : isLoggedIn ? "관심종목을 추가하거나 필터를 조정하세요" : "필터를 조정하거나 나중에 다시 시도해 보세요"}
            </p>
            {!corpCode && isLoggedIn && (
              <Link href="/watchlist" className="mt-3 inline-block">
                <Button variant="outline" size="sm">관심종목 추가하기</Button>
              </Link>
            )}
          </div>
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
                const prev = bookmarks;
                // Optimistic update
                if (exists) {
                  setBookmarks(bookmarks.filter((b) => b.rcept_no !== disc.rcept_no));
                } else {
                  setBookmarks([...bookmarks, { rcept_no: disc.rcept_no, corp_name: disc.corp_name, report_nm: disc.report_nm, memo: "", created_at: "" }]);
                }
                try {
                  const res = exists
                    ? await api.removeBookmark(disc.rcept_no)
                    : await api.addBookmark({
                        rcept_no: disc.rcept_no,
                        corp_name: disc.corp_name,
                        report_nm: disc.report_nm,
                      });
                  setBookmarks(res.bookmarks);
                } catch {
                  setBookmarks(prev); // rollback
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
  );
}

export default function DisclosuresPage() {
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
      <DisclosuresContent />
    </Suspense>
  );
}
