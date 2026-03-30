"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BookmarkCheck,
  LineChart,
  Shield,
  Star,
} from "lucide-react";
import { api, DashboardSummary, DisclosurePreview, DividendCalendarEvent } from "@/lib/api";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";

const features = [
  {
    icon: BrainCircuit,
    title: "중요 공시 요약",
    desc: "긴 공시 원문 대신 핵심 내용과 중요도를 빠르게 확인할 수 있습니다",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: LineChart,
    title: "재무제표 & 주가",
    desc: "매출, 영업이익, 배당 흐름과 주가 차트를 한 화면에서 비교합니다",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Star,
    title: "관심종목 대시보드",
    desc: "내가 보는 종목만 모아서 최근 공시, 브리핑, 추이를 집중해서 볼 수 있습니다",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BookmarkCheck,
    title: "북마크 & 메모",
    desc: "중요한 공시를 북마크하고 나만의 메모를 남길 수 있습니다",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: BarChart3,
    title: "배당 캘린더",
    desc: "관심종목 기준 예상 배당 기준일과 최근 배당 변화를 빠르게 확인합니다",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

interface LandingProps {
  summary?: DashboardSummary | null;
  disclosures?: DisclosurePreview[];
  dividendEvents?: DividendCalendarEvent[];
}

export function Landing({
  summary: initialSummary,
  disclosures: initialDisclosures,
  dividendEvents: initialDividendEvents,
}: LandingProps = {}) {
  const hasServerData =
    initialSummary != null ||
    (initialDisclosures && initialDisclosures.length > 0) ||
    (initialDividendEvents && initialDividendEvents.length > 0);
  const shouldRefetch = initialSummary == null;
  const [summary, setSummary] = useState<DashboardSummary | null>(
    initialSummary ?? null,
  );
  const [disclosures, setDisclosures] = useState<DisclosurePreview[]>(
    initialDisclosures ?? [],
  );
  const [dividendEvents, setDividendEvents] = useState<DividendCalendarEvent[]>(
    initialDividendEvents ?? [],
  );
  const [loading, setLoading] = useState(!hasServerData);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelayRef = useRef(5000);

  const applyPublicData = useCallback((discData: { disclosures: DisclosurePreview[]; total: number }) => {
    setDisclosures(discData.disclosures.slice(0, 10));
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            today_disclosures: discData.total,
            bullish: discData.disclosures.filter(
              (d) => d.analysis?.category === "호재",
            ).length,
            bearish: discData.disclosures.filter(
              (d) => d.analysis?.category === "악재",
            ).length,
          }
        : prev,
    );
  }, []);

  // summary가 없으면 클라이언트에서 반드시 재조회 (서버 fetch 부분 실패 복구)
  useEffect(() => {
    if (!shouldRefetch) return;
    async function load() {
      try {
        const [dashData, discData, dividendData] = await Promise.all([
          api.getPublicDashboard(),
          api.getPublicDisclosurePreview({ days: 3, limit: 10 }),
          api.getPublicDividendPreview({ limit: 6 }),
        ]);
        setSummary({
          ...dashData,
          today_disclosures: discData.total,
          bullish: discData.disclosures.filter(
            (d) => d.analysis?.category === "호재",
          ).length,
          bearish: discData.disclosures.filter(
            (d) => d.analysis?.category === "악재",
          ).length,
        });
        applyPublicData(discData);
        setDividendEvents(dividendData.events);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applyPublicData, shouldRefetch]);

  // 미분석 공시가 있으면 5초 간격 폴링으로 분석 완료 반영
  const hasPending = disclosures.some((d) => !d.analysis);

  useEffect(() => {
    if (!hasPending) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;
    pollDelayRef.current = 5000;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") {
        pollTimeoutRef.current = setTimeout(tick, 15000);
        return;
      }

      try {
        const data = await api.getPublicDisclosurePreview({ days: 3, limit: 10 });
        applyPublicData(data);
        if (!data.disclosures.some((d) => !d.analysis)) {
          pollTimeoutRef.current = null;
          return;
        }
        pollDelayRef.current = Math.min(Math.round(pollDelayRef.current * 1.5), 30000);
      } catch {
        pollDelayRef.current = Math.min(Math.round(pollDelayRef.current * 2), 30000);
      }

      pollTimeoutRef.current = setTimeout(tick, pollDelayRef.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !pollTimeoutRef.current) {
        pollTimeoutRef.current = setTimeout(tick, 1000);
      }
    };

    pollTimeoutRef.current = setTimeout(tick, pollDelayRef.current);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [applyPublicData, hasPending]);

  return (
    <div className="space-y-20 pb-12">
      {/* Hero */}
      <section className="relative flex flex-col items-center text-center pt-12 sm:pt-20 overflow-hidden">
        {/* Glow — 모바일에서도 원형 유지되도록 뷰포트 대비 크기 제한 */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[80vw] sm:w-[600px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />

        <div className="relative">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
            <span className="text-foreground">공시를 읽는 시간,</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
              딱 줄여드립니다
            </span>
            <br />
            <span className="text-foreground">중요한 것만 빠르게</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            AI가 중요한 공시를 먼저 추려주고,
            <br className="hidden sm:block" />
            관심종목 흐름과 배당 일정까지 한눈에 정리해드립니다
          </p>

          <div className="mt-10 pb-5">
            <Link
              href="/disclosures"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20">
              최근 중요 공시 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 실시간 요약 */}
      <section className="grid grid-cols-3 gap-3">
        <Link
          prefetch={true}
          href={{ pathname: "/disclosures", query: { days: "3" } }}
          className="glass-card rounded-2xl p-4 text-center transition-colors hover:bg-accent/40">
          <p className="text-[10px] font-medium text-muted-foreground">
            최근 3일 공시
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            {summary ? summary.today_disclosures : "…"}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </Link>
        <Link
          prefetch={true}
          href={{
            pathname: "/disclosures",
            query: { days: "3", category: "호재" },
          }}
          className="glass-card rounded-2xl p-4 text-center transition-colors hover:bg-accent/40">
          <p className="text-[10px] font-medium text-muted-foreground">호재</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">
            {summary ? summary.bullish : "…"}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </Link>
        <Link
          prefetch={true}
          href={{
            pathname: "/disclosures",
            query: { days: "3", category: "악재" },
          }}
          className="glass-card rounded-2xl p-4 text-center transition-colors hover:bg-accent/40">
          <p className="text-[10px] font-medium text-muted-foreground">악재</p>
          <p className="text-2xl font-black text-red-500 mt-1">
            {summary ? summary.bearish : "…"}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">배당 기준일 미리 보기</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              비로그인 사용자를 위한 공개 미리보기입니다. 인기 종목 기준 최근 배당 기준일과 배당 흐름을 보여줍니다
            </p>
          </div>
          <Link
            href="/login"
            className="text-xs text-primary hover:underline">
            로그인하고 내 종목 보기 →
          </Link>
        </div>

        {dividendEvents.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dividendEvents.map((event) => (
              <Link
                key={event.corp_code}
                href={`/company/${event.corp_code}`}
                className="glass-card rounded-2xl p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{event.corp_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {event.last_confirmed_record_date
                        ? `최근 배당 기준일 ${event.last_confirmed_record_date}`
                        : event.reference_date
                          ? `최근 결산 ${event.reference_date}`
                          : "배당 기준일 공시 확인 필요"}
                    </p>
                  </div>
                  {event.last_confirmed_record_date ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                      확인됨
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      확인 필요
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>DPS {event.recent_dps > 0 ? event.recent_dps.toLocaleString() : "-"}</span>
                  <span>
                    {event.change_vs_prev_year === "increase" && "증액"}
                    {event.change_vs_prev_year === "flat" && "동결"}
                    {event.change_vs_prev_year === "decrease" && "감액"}
                    {event.change_vs_prev_year === "no_dividend" && "무배당"}
                    {event.change_vs_prev_year === "new" && "신규"}
                    {event.change_vs_prev_year === "unknown" && "변화 미확인"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            배당 일정 데이터가 아직 준비되지 않았습니다
          </p>
        )}
      </section>

      {/* 최신 AI 분석 공시 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">최신 AI 분석 공시</h2>
          <Link
            href="/disclosures"
            className="text-xs text-primary hover:underline">
            전체보기 →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : disclosures.length > 0 ? (
          <div className="space-y-3">
            {disclosures.map((d) => (
              <DisclosureCard key={d.rcept_no} disclosure={d} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            공시 데이터가 없습니다
          </p>
        )}
      </section>

      {/* Features */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            투자 판단에 필요한 기능만 담았습니다
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            중요 공시 요약, 관심종목 추적, 배당 일정 확인을 한 화면에서 제공합니다
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg group ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} mb-4 transition-transform group-hover:scale-110`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <div className="glass-card rounded-3xl p-10 sm:p-14 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
          <div className="relative">
            <Shield className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              내 종목 중심의 공시 화면을 바로 시작해보세요
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              관심종목 등록, AI 브리핑, 배당 캘린더, 북마크 메모까지
              로그인하면 바로 사용할 수 있습니다
            </p>
            <Link
              href={`/login`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted mt-6">
              대시보드 시작하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
