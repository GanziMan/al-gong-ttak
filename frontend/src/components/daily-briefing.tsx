"use client";

import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { api, getCached, setCache, isFresh, type DailyBriefing as BriefingType } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { categoryColor, categoryLabel } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

export function DailyBriefing() {
  const CACHE_KEY = "/api/briefing/daily";
  const [data, setData] = useState<BriefingType | null>(() => getCached<BriefingType>(CACHE_KEY));

  useEffect(() => {
    if (data && isFresh(CACHE_KEY)) return;
    api.getDailyBriefing().then((d) => { setData(d); setCache(CACHE_KEY, d); }).catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-violet-500/5 to-transparent border border-primary/10 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-[14px] font-bold">오늘의 브리핑</h2>
        {data && <span className="text-[11px] text-muted-foreground ml-auto">{data.date}</span>}
      </div>

      {data ? (
        <>
          {/* Metric chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              호재 {data.bullish}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              <TrendingDown className="h-3 w-3" />
              악재 {data.bearish}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              <Minus className="h-3 w-3" />
              중립 {data.neutral}
            </span>
          </div>

          {/* Top disclosures */}
          {data.top_disclosures.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {data.top_disclosures.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums w-6 text-center",
                      d.importance_score >= 70 ? "text-red-500" : d.importance_score >= 40 ? "text-amber-500" : "text-muted-foreground",
                    )}
                  >
                    {d.importance_score}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] rounded-md px-1 py-0",
                      categoryColor[d.category] || "border-zinc-300 text-zinc-600",
                    )}
                  >
                    {categoryLabel(d.category, d.importance_score)}
                  </Badge>
                  <span className="font-medium text-foreground/80 truncate">
                    {d.corp_name}
                  </span>
                  <span className="text-muted-foreground/60 truncate flex-1">
                    {d.report_nm}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Narrative */}
          <p className="text-[12px] text-muted-foreground/70 leading-relaxed mb-2">
            {data.narrative}
          </p>
        </>
      ) : (
        <div className="space-y-2.5 mb-3">
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>
      )}

      <Link
        href="/disclosures"
        className="text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors"
      >
        전체 공시 보기 →
      </Link>
    </div>
  );
}
