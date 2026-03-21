"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/lib/api";
import { categoryColor, categoryBorder, categoryDot, formatDate, scoreColor } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

interface DisclosureCardProps {
  disclosure: Disclosure;
}

export function DisclosureCard({ disclosure }: DisclosureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const analysis = disclosure.analysis;
  const cat = analysis?.category || "단순정보";
  const score = analysis?.importance_score ?? 0;

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-white card-elevated border-l-[3px] transition-all hover:shadow-md",
        categoryBorder[cat] || "border-l-zinc-300"
      )}
    >
      <div className="px-4 py-3.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", categoryDot[cat])} />
              <span className="text-[11px] font-semibold text-foreground">
                {disclosure.corp_name}
              </span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {formatDate(disclosure.rcept_dt)}
              </span>
            </div>
            <h3 className="text-[13px] font-medium leading-snug text-foreground/85">
              {disclosure.report_nm}
            </h3>
          </div>
          {analysis ? (
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={cn("text-[10px] font-medium rounded-md", categoryColor[cat])}>
                {cat}
              </Badge>
              <span className={cn("text-lg font-bold tabular-nums tracking-tighter", scoreColor(score))}>
                {score}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
              <div className="h-6 w-8 rounded bg-muted animate-pulse" />
            </div>
          )}
        </div>

        {/* Action item */}
        {analysis ? (
          <div className="mt-2.5">
            <p className="text-[12px] leading-relaxed text-muted-foreground/70">
              {analysis.action_item}
            </p>

            {/* Expandable AI summary */}
            {expanded && (
              <div className="mt-3 rounded-lg border border-border bg-accent/30 p-3.5">
                <p className="text-[11px] font-semibold text-primary/70 mb-2">
                  AI 분석 요약
                </p>
                <p className="text-[12px] leading-relaxed text-foreground/75 whitespace-pre-wrap">
                  {analysis.summary}
                </p>
              </div>
            )}

            <button
              className="mt-2.5 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "분석 숨기기" : "분석 보기"}
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            <span className="text-[11px] text-muted-foreground/50">분석 중...</span>
          </div>
        )}
      </div>
    </article>
  );
}
