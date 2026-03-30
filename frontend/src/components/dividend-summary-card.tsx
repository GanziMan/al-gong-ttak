"use client";

import { CalendarDays, Coins } from "lucide-react";
import { DividendCalendarEvent } from "@/lib/api";

interface DividendSummaryCardProps {
  event: DividendCalendarEvent | null;
  corpName?: string;
  stockCode?: string;
}

const CHANGE_META: Record<DividendCalendarEvent["change_vs_prev_year"], { label: string; className: string }> = {
  increase: { label: "증액", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  flat: { label: "동결", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  decrease: { label: "감액", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  no_dividend: { label: "무배당", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  new: { label: "신규", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  unknown: { label: "미확인", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

function formatDate(date: string) {
  if (!date) return "미정";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

export function DividendSummaryCard({ event, corpName, stockCode }: DividendSummaryCardProps) {
  if (!event) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary/60" />
          <h2 className="text-[13px] font-semibold text-foreground/80">배당 일정</h2>
        </div>
        <p className="text-[12px] text-muted-foreground/60 mt-3">
          최근 사업보고서 기준으로 배당 일정을 계산할 수 있는 데이터가 없습니다.
        </p>
      </div>
    );
  }

  const statusLabel = event.status === "expected" ? "예상" : "미정";
  const change = CHANGE_META[event.change_vs_prev_year] ?? CHANGE_META.unknown;
  const title = corpName || event.corp_name || "이 종목";
  const code = stockCode || event.stock_code;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary/60" />
            <h2 className="text-[13px] font-semibold text-foreground/80">배당 일정</h2>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            {title}{code ? ` · ${code}` : ""}의 최근 배당 패턴 기준
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
            {statusLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${change.className}`}>
            {change.label}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/30 bg-background/60 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/60">다음 예상 기준일</p>
          <p className="text-[15px] font-semibold text-foreground mt-1">{formatDate(event.next_event_date)}</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-background/60 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/60">최근 주당배당금</p>
          <p className="text-[15px] font-semibold text-foreground mt-1 inline-flex items-center gap-1">
            <Coins className="h-4 w-4 text-primary/70" />
            {event.recent_dps_raw || event.recent_dps || "-"}원
          </p>
        </div>
        <div className="rounded-xl border border-border/30 bg-background/60 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/60">직전 기준일</p>
          <p className="text-[15px] font-semibold text-foreground mt-1">{formatDate(event.reference_date)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground/80">
        {typeof event.yield_pct === "number" && <span>배당수익률 {event.yield_pct}%</span>}
        {typeof event.payout_pct === "number" && <span>배당성향 {event.payout_pct}%</span>}
        <span>기준 연도 {event.source_year}</span>
      </div>

      <p className="text-[11px] text-muted-foreground/60 mt-3">{event.note}</p>
    </div>
  );
}
