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
import { api, DashboardSummary, DisclosurePreview } from "@/lib/api";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";

const features = [
  {
    icon: BrainCircuit,
    title: "AI 공시 분석",
    desc: "상장기업 공시를 AI가 자동 분류하고 호재/악재를 판별합니다",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: LineChart,
    title: "재무제표 & 주가",
    desc: "매출, 영업이익, 배당 내역과 주가 차트를 한눈에 확인합니다",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Star,
    title: "관심종목 & 브리핑",
    desc: "관심 종목의 공시만 모아보고 매일 AI 브리핑을 받아보세요",
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
    title: "공시 추이 분석",
    desc: "30일간 공시 건수와 중요도 트렌드를 차트로 추적합니다",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

interface LandingProps {
  summary?: DashboardSummary | null;
  disclosures?: DisclosurePreview[];
}

export function Landing({
  summary: initialSummary,
  disclosures: initialDisclosures,
}: LandingProps = {}) {
  const hasServerData =
    initialSummary != null ||
    (initialDisclosures && initialDisclosures.length > 0);
  const shouldRefetch = initialSummary == null;
  const [summary, setSummary] = useState<DashboardSummary | null>(
    initialSummary ?? null,
  );
  const [disclosures, setDisclosures] = useState<DisclosurePreview[]>(
    initialDisclosures ?? [],
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
        const [dashData, discData] = await Promise.all([
          api.getPublicDashboard(),
          api.getPublicDisclosurePreview({ days: 3, limit: 10 }),
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
            <span className="text-foreground">공시,</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
              알아서 딱
            </span>
            <br />
            <span className="text-foreground">분석해드립니다</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            상장기업이 발표하는 주요 소식을 AI가 자동 분석하고,
            <br className="hidden sm:block" />
            호재/악재를 판별해 알려드립니다
          </p>

          <div className="mt-10 pb-5">
            <Link
              href="/disclosures"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20">
              공시 보러가기
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
            강력한 기능
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI가 공시를 분석하고, 알림을 보내고, 트렌드를 추적합니다
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
              나만의 공시 대시보드를 만들어보세요
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              무료로 관심종목 등록, AI 브리핑, 북마크 메모, 재무제표 비교까지 —
              로그인하면 모든 기능을 이용할 수 있어요
            </p>
            <Link
              href={`/login`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted mt-6">
              로그인하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
