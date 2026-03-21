"use client";

import { useState, useEffect, useCallback } from "react";
import { DisclosureFilters } from "@/components/disclosure-filters";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Disclosure } from "@/lib/api";

export default function DisclosuresPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState(7);
  const [minScore, setMinScore] = useState(0);

  const fetchDisclosures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDisclosures({
        days,
        category: category === "all" ? undefined : category,
        min_score: minScore || undefined,
      });
      setDisclosures(data.disclosures);
      setError("");
    } catch {
      setError("공시를 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }, [days, category, minScore]);

  useEffect(() => {
    fetchDisclosures();
  }, [fetchDisclosures]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">공시 피드</h1>
        <p className="text-sm text-muted-foreground">
          관심종목의 공시를 AI가 분석한 결과를 확인하세요
        </p>
      </div>

      <DisclosureFilters
        category={category}
        days={days}
        minScore={minScore}
        onCategoryChange={setCategory}
        onDaysChange={setDays}
        onMinScoreChange={setMinScore}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : disclosures.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              공시가 없습니다
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              관심종목을 추가하거나 필터를 변경해보세요
            </p>
          </div>
        ) : (
          disclosures.map((d) => (
            <DisclosureCard key={d.rcept_no} disclosure={d} />
          ))
        )}
      </div>

      {!loading && disclosures.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          총 {disclosures.length}건의 공시
        </p>
      )}
    </div>
  );
}
