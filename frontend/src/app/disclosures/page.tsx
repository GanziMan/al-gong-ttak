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
      setError("Unable to load disclosures. Check backend server.");
    } finally {
      setLoading(false);
    }
  }, [days, category, minScore]);

  useEffect(() => {
    fetchDisclosures();
  }, [fetchDisclosures]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Disclosures</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">
            AI-analyzed filings from your watchlist
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
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : disclosures.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/30 py-16 text-center">
            <p className="text-sm text-muted-foreground/60">No filings found</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/40">
              Add stocks to your watchlist or adjust filters
            </p>
          </div>
        ) : (
          disclosures.map((d) => (
            <DisclosureCard key={d.rcept_no} disclosure={d} />
          ))
        )}
      </div>

      {!loading && disclosures.length > 0 && (
        <p className="text-center text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/40">
          {disclosures.length} filing{disclosures.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
