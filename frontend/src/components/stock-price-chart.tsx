"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { api, type StockPriceDay } from "@/lib/api";

const StockChart = dynamic(() => import("@/components/stock-chart-inner"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted" />,
});

interface StockPriceChartProps {
  corpCode: string;
  initialPrices?: StockPriceDay[];
}

export function StockPriceChart({ corpCode, initialPrices = [] }: StockPriceChartProps) {
  const [prices, setPrices] = useState<StockPriceDay[]>(initialPrices);
  const [loading, setLoading] = useState(initialPrices.length === 0);

  useEffect(() => {
    if (initialPrices.length > 0) return;
    api
      .getStockPrices(corpCode, 30)
      .then((d) => setPrices(d.prices.slice().reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [corpCode, initialPrices]);

  if (loading) {
    return <div className="glass-card rounded-2xl h-52 animate-pulse" />;
  }

  if (prices.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl px-4 py-3.5">
      <h3 className="text-[13px] font-semibold mb-3">30일 주가 추이</h3>
      <StockChart prices={prices} />
    </div>
  );
}
