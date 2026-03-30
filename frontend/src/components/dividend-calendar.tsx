"use client";

import Link from "next/link";
import { CalendarDays, Coins } from "lucide-react";
import { DividendCalendarEvent } from "@/lib/api";

interface DividendCalendarProps {
  events: DividendCalendarEvent[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  countLabel?: string;
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

function buildMetaBadges(event: DividendCalendarEvent) {
  return [
    typeof event.yield_pct === "number" ? `배당수익률 ${event.yield_pct}%` : null,
    event.source_year ? `기준 연도 ${event.source_year}` : null,
    event.payout_cycle_label || null,
    typeof event.payout_frequency_per_year === "number" ? `최근 연 ${event.payout_frequency_per_year}회` : null,
  ].filter(Boolean) as string[];
}

export function DividendCalendar({
  events,
  title = "다가오는 배당 일정",
  description = "배당 흐름은 보여주되, 실제 배당 기준일은 공시 확인이 필요합니다",
  emptyMessage = "배당 캘린더를 만들 수 있는 데이터가 아직 없습니다",
  countLabel,
}: DividendCalendarProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary/60" />
          <div>
            <h2 className="text-[13px] font-semibold text-foreground/80">{title}</h2>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/60">{countLabel ?? `${events.length}개 종목`}</span>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/50 text-center py-8">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const change = CHANGE_META[event.change_vs_prev_year] ?? CHANGE_META.unknown;
              const metaBadges = buildMetaBadges(event);
              const statusLabel =
                event.status === "confirmed"
                  ? "확정"
                  : event.status === "expected"
                    ? "예상"
                    : "확인 필요";

              return (
                <Link
                  key={event.corp_code}
                  href={`/company/${event.corp_code}`}
                  className="block rounded-2xl border border-border/40 bg-background/60 px-4 py-3 transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">{event.corp_name}</p>
                        <span className="text-[11px] text-primary/70">{event.stock_code}</span>
                        <span
                          className={`rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 whitespace-nowrap ${
                            statusLabel === "확인 필요" ? "hidden sm:inline-flex" : "inline-flex"
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${change.className}`}>
                          {change.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {metaBadges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground/60">배당 기준일</p>
                      <p className="text-[13px] font-semibold text-foreground mt-0.5">
                        {event.next_event_date ? formatDate(event.next_event_date) : "공시 확인 필요"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      최근 DPS {event.recent_dps_raw || event.recent_dps || "-"}원
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
