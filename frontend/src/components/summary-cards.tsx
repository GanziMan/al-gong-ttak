"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    { title: "관심종목", value: watchlistCount, unit: "종목" },
    { title: "오늘 공시", value: todayDisclosures, unit: "건" },
    {
      title: "호재",
      value: bullish,
      unit: "건",
      className: "text-green-600",
    },
    {
      title: "악재",
      value: bearish,
      unit: "건",
      className: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${card.className || ""}`}>
              {card.value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {card.unit}
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
