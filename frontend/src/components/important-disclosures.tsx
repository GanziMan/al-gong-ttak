"use client";

import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/lib/api";
import { categoryColor, categoryDot, formatDateShort, scoreColor } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

interface ImportantDisclosuresProps {
  disclosures: Disclosure[];
}

export function ImportantDisclosures({ disclosures }: ImportantDisclosuresProps) {
  return (
    <div className="rounded-xl border border-border/30 card-gradient overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          High Priority
        </h2>
      </div>
      {disclosures.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground/60">No high-priority filings detected</p>
          <p className="mt-1 text-[11px] text-muted-foreground/40">Alerts will appear here when found</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {disclosures.map((d) => {
            const cat = d.analysis?.category || "단순정보";
            const score = d.analysis?.importance_score ?? 0;
            return (
              <div key={d.rcept_no} className="group px-4 py-3 hover:bg-accent/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", categoryDot[cat])} />
                      <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums">
                        {formatDateShort(d.rcept_dt)}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground">
                        {d.corp_name}
                      </span>
                    </div>
                    <p className="text-[13px] truncate text-foreground/80 group-hover:text-foreground transition-colors">
                      {d.report_nm}
                    </p>
                    {d.analysis?.action_item && (
                      <p className="mt-1 text-[11px] text-muted-foreground/60 line-clamp-1">
                        {d.analysis.action_item}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-mono font-bold tabular-nums", scoreColor(score))}>
                      {score}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] rounded-md", categoryColor[cat])}>
                      {cat}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RecentTimelineProps {
  disclosures: Disclosure[];
}

export function RecentTimeline({ disclosures }: RecentTimelineProps) {
  return (
    <div className="rounded-xl border border-border/30 card-gradient overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary/60" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Latest Filings
        </h2>
      </div>
      {disclosures.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground/60">No filings yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground/40">
            Add stocks to your watchlist to see filings here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {disclosures.map((d) => (
            <div
              key={d.rcept_no}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/20 transition-all"
            >
              <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                {formatDateShort(d.rcept_dt)}
              </span>
              <span className="text-[11px] font-semibold text-primary/80 shrink-0 group-hover:text-primary transition-colors">
                {d.corp_name}
              </span>
              <span className="truncate text-[12px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                {d.report_nm}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
