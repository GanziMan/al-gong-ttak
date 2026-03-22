"use client";

import Link from "next/link";
import { Star, FileText, TrendingUp, TrendingDown } from "lucide-react";

interface SummaryCardsProps {
  watchlistCount: number;
  todayDisclosures: number;
  bullish: number;
  bearish: number;
}

export function SummaryCards({
  watchlistCount,
  todayDisclosures,
  bullish,
  bearish,
}: SummaryCardsProps) {
  const cards = [
    {
      label: "관심종목",
      value: watchlistCount,
      sub: "추적 중인 종목",
      color: "text-primary",
      icon: Star,
      iconBg: "bg-primary/10 text-primary",
      href: "/watchlist",
    },
    {
      label: "오늘",
      value: todayDisclosures,
      sub: "신규 공시",
      color: "text-foreground",
      icon: FileText,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      href: "/disclosures",
    },
    {
      label: "호재",
      value: bullish,
      sub: "긍정 시그널",
      color: "text-emerald-600 dark:text-emerald-400",
      icon: TrendingUp,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      href: "/disclosures?category=호재",
    },
    {
      label: "악재",
      value: bearish,
      sub: "위험 알림",
      color: "text-red-600 dark:text-red-400",
      icon: TrendingDown,
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      href: "/disclosures?category=악재",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="glass-card rounded-2xl p-4 transition-transform sm:hover:scale-[1.02] hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                {card.label}
              </p>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${card.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className={`text-3xl font-bold tabular-nums tracking-tight ${card.color}`}>
              {card.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">{card.sub}</p>
          </Link>
        );
      })}
    </div>
  );
}
