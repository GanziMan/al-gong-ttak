"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DisclosureFilters } from "@/components/disclosure-filters";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Disclosure } from "@/lib/api";

function DisclosuresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const corpCode = searchParams.get("corp_code");

  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState(7);
  const [minScore, setMinScore] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCorpFilter = useCallback(() => {
    router.replace("/disclosures");
  }, [router]);

  const handleCategoryChange = useCallback((v: string) => {
    setCategory(v);
    if (corpCode) clearCorpFilter();
  }, [corpCode, clearCorpFilter]);

  const handleDaysChange = useCallback((v: number) => {
    setDays(v);
    if (corpCode) clearCorpFilter();
  }, [corpCode, clearCorpFilter]);

  const handleMinScoreChange = useCallback((v: number) => {
    setMinScore(v);
    if (corpCode) clearCorpFilter();
  }, [corpCode, clearCorpFilter]);

  const fetchDisclosures = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
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
      setError("공시 데이터를 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [days, category, minScore]);

  useEffect(() => {
    fetchDisclosures();
  }, [fetchDisclosures]);

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
              <h1 className="text-xl font-bold tracking-tight mt-1">
                {corpName ?? corpCode} 공시
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                해당 종목의 AI 분석 공시
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight">공시</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                관심종목의 AI 분석 공시
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {corpCode ? "해당 종목의 공시가 없습니다" : "공시가 없습니다"}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/60">
              {corpCode
                ? "기간이나 필터를 조정해 보세요"
                : "관심종목을 추가하거나 필터를 조정하세요"}
            </p>
          </div>
        ) : (
          filtered.map((d) => (
            <DisclosureCard key={d.rcept_no} disclosure={d} />
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
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <DisclosuresContent />
    </Suspense>
  );
}
