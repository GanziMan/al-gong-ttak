"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  BrainCircuit,
  Shield,
  Star,
} from "lucide-react";
import { api, DashboardSummary, Disclosure } from "@/lib/api";
import { DisclosureCard } from "@/components/disclosure-card";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const features = [
  {
    icon: BrainCircuit,
    title: "AI 공시 분석",
    desc: "Gemini AI가 공시를 자동 분류하고 중요도를 평가합니다",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Star,
    title: "관심종목 + 알림",
    desc: "관심 종목을 추적하고 텔레그램으로 중요 공시 알림을 받습니다",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "공시 추이 분석",
    desc: "기간별 공시 건수와 중요도 트렌드를 차트로 확인합니다",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

export function Landing() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, discData] = await Promise.all([
          api.getPublicDashboard(),
          api.getPublicDisclosures({ days: 7 }),
        ]);
        setSummary(dashData);
        setDisclosures(discData.disclosures.slice(0, 10));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-20 pb-12">
      {/* Hero */}
      <section className="relative flex flex-col items-center text-center pt-12 sm:pt-20">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />

        <div className="relative">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
            <span className="text-foreground">공시,</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
              알아서 잘 딱
            </span>
            <br />
            <span className="text-foreground">분석해드립니다</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            DART 공시를 AI가 자동으로 분석하고,
            <br className="hidden sm:block" />
            호재/악재를 판별해 알려드립니다
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={`${API_BASE}/api/auth/kakao/login`}
              className="mx-auto inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-500/20"
              style={{ backgroundColor: "#FEE500", color: "#000000" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0.5C4.029 0.5 0 3.588 0 7.393c0 2.388 1.558 4.495 3.932 5.734l-1.01 3.693c-.088.322.28.577.556.388L7.555 14.58c.474.056.958.087 1.445.087 4.971 0 9-3.088 9-6.893S13.971 0.5 9 0.5"
                  fill="#000000"
                />
              </svg>
              카카오로 시작하기
            </a>
          </div>
        </div>
      </section>

      {/* 실시간 요약 */}
      <section className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground">최근 7일 공시</p>
          <p className="text-2xl font-black text-foreground mt-1">{summary?.today_disclosures ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground">호재</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">{summary?.bullish ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground">악재</p>
          <p className="text-2xl font-black text-red-500 mt-1">{summary?.bearish ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">건</p>
        </div>
      </section>

      {/* 최신 AI 분석 공시 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">최신 AI 분석 공시</h2>
          <Link href="/disclosures" className="text-xs text-primary hover:underline">
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
          <p className="text-sm text-muted-foreground text-center py-8">공시 데이터를 불러오는 중입니다...</p>
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg group"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} mb-4 transition-transform group-hover:scale-110`}
              >
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
              지금 바로 시작하세요
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              로그인하면 관심종목 저장, 텔레그램 알림 등 더 많은 기능을 사용할 수 있습니다
            </p>
            <a
              href={`${API_BASE}/api/auth/kakao/login`}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mt-8 shadow-lg shadow-yellow-500/20"
              style={{ backgroundColor: "#FEE500", color: "#000000" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0.5C4.029 0.5 0 3.588 0 7.393c0 2.388 1.558 4.495 3.932 5.734l-1.01 3.693c-.088.322.28.577.556.388L7.555 14.58c.474.056.958.087 1.445.087 4.971 0 9-3.088 9-6.893S13.971 0.5 9 0.5"
                  fill="#000000"
                />
              </svg>
              카카오로 시작하기
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
