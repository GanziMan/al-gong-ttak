"use client";

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
      label: "WATCHLIST",
      value: watchlistCount,
      sub: "stocks tracked",
      color: "text-primary",
      glow: "glow-blue",
      border: "border-primary/20",
      icon: "◈",
    },
    {
      label: "TODAY",
      value: todayDisclosures,
      sub: "new filings",
      color: "text-foreground",
      glow: "",
      border: "border-border/30",
      icon: "◉",
    },
    {
      label: "BULLISH",
      value: bullish,
      sub: "positive signals",
      color: "text-emerald-400",
      glow: "glow-green",
      border: "border-emerald-500/20",
      icon: "▲",
    },
    {
      label: "BEARISH",
      value: bearish,
      sub: "risk alerts",
      color: "text-red-400",
      glow: "glow-red",
      border: "border-red-500/20",
      icon: "▼",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative rounded-xl border ${card.border} card-gradient p-4 transition-all hover:scale-[1.02] ${card.glow}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {card.label}
            </p>
            <span className={`text-xs opacity-50 ${card.color}`}>{card.icon}</span>
          </div>
          <p className={`mt-2 text-3xl font-bold font-mono tabular-nums tracking-tight ${card.color}`}>
            {card.value}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
