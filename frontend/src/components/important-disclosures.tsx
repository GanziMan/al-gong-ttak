"use client";

import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/lib/api";
import { categoryColor, categoryDot, categoryLabel, formatDateShort, scoreColor } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

interface ImportantDisclosuresProps {
  disclosures: Disclosure[];
}

export function ImportantDisclosures({ disclosures }: ImportantDisclosuresProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h2 className="text-[12px] font-semibold text-muted-foreground">
          주요 공시
        </h2>
      </div>
      {disclosures.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">주요 공시가 없습니다</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">중요 공시 발견 시 이곳에 표시됩니다</p>
          <Link href="/watchlist" className="mt-3 inline-block">
            <Button variant="outline" size="sm">관심종목 추가하기</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {disclosures.map((d) => {
            const cat = d.analysis?.category || "단순정보";
            const score = d.analysis?.importance_score ?? 0;
            const catLabel = categoryLabel(cat, score);
            return (
              <Link key={d.rcept_no} href={`/disclosures?corp_code=${d.corp_code}`} className="block group px-4 py-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", categoryDot[cat])} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
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
                    <span className={cn("text-xs font-bold tabular-nums", scoreColor(score))}>
                      {score}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] rounded-md", categoryColor[cat])}>
                      {catLabel}
                    </Badge>
                  </div>
                </div>
              </Link>
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
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary/60" />
        <h2 className="text-[12px] font-semibold text-muted-foreground">
          최신 공시
        </h2>
      </div>
      {disclosures.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">공시 내역이 없습니다</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            관심종목을 추가하면 공시가 표시됩니다
          </p>
          <Link href="/watchlist" className="mt-3 inline-block">
            <Button variant="outline" size="sm">관심종목 추가하기</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {disclosures.map((d) => (
            <Link
              key={d.rcept_no}
              href={`/disclosures?corp_code=${d.corp_code}`}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
                {formatDateShort(d.rcept_dt)}
              </span>
              <span className="text-[11px] font-semibold text-primary/80 shrink-0 group-hover:text-primary transition-colors">
                {d.corp_name}
              </span>
              <span className="truncate text-[12px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                {d.report_nm}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
