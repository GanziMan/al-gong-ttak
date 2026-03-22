"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  FileSearch,
  Shield,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

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
    icon: TrendingUp,
    title: "호재/악재 판별",
    desc: "공시의 시장 영향을 호재, 악재, 중립으로 분류합니다",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Star,
    title: "관심종목 관리",
    desc: "내가 관심 있는 종목만 추적하고 알림을 받을 수 있습니다",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Bell,
    title: "텔레그램 알림",
    desc: "중요한 공시가 뜨면 텔레그램으로 즉시 알림을 보내줍니다",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "공시 추이 분석",
    desc: "기간별 공시 건수와 중요도 트렌드를 차트로 확인합니다",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: FileSearch,
    title: "유사 공시 탐색",
    desc: "과거 유사한 공시를 찾아 비교 분석할 수 있습니다",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const steps = [
  { num: "1", title: "카카오 로그인", desc: "간편하게 로그인하세요" },
  { num: "2", title: "관심종목 추가", desc: "추적할 종목을 선택하세요" },
  { num: "3", title: "AI가 분석", desc: "공시를 자동으로 분석합니다" },
];

export function Landing() {
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

        {/* Mock dashboard preview */}
        <div className="relative mt-16 w-full max-w-3xl">
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "관심종목", value: "12", sub: "종목" },
                { label: "오늘 공시", value: "47", sub: "건" },
                { label: "호재", value: "8", sub: "+17%" },
                { label: "악재", value: "3", sub: "-6%" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="glass-surface rounded-2xl p-4 text-center"
                >
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-2xl font-black text-foreground mt-1">
                    {card.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Fake chart bars */}
            <div className="mt-6 flex items-end justify-between gap-1.5 h-20 px-2">
              {[35, 55, 40, 70, 50, 85, 65, 90, 45, 75, 60, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-primary/20 transition-all"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 px-2">
              <span className="text-[9px] text-muted-foreground/40">3/10</span>
              <span className="text-[9px] text-muted-foreground/40">3/22</span>
            </div>
          </div>

          {/* Floating cards */}
          <div className="absolute -top-4 -right-2 sm:-right-6 glass-card rounded-2xl p-3 shadow-lg animate-float-slow">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground">
                  삼성전자
                </p>
                <p className="text-[9px] text-emerald-500 font-semibold">
                  호재 92점
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-3 -left-2 sm:-left-6 glass-card rounded-2xl p-3 shadow-lg animate-float-delayed">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground">
                  AI 분석 완료
                </p>
                <p className="text-[9px] text-muted-foreground">12건 처리됨</p>
              </div>
            </div>
          </div>
        </div>
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

      {/* How it works */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            시작하는 법
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            3단계로 간편하게 시작하세요
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-4">
              <div className="glass-card rounded-2xl p-6 text-center w-52">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                  <span className="text-lg font-black text-primary">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.desc}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block text-muted-foreground/30 text-2xl font-light">
                  &rarr;
                </div>
              )}
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
              카카오 로그인 한 번이면 모든 기능을 무료로 사용할 수 있습니다
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
