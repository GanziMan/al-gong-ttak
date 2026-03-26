"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { StockPriceDay } from "@/lib/api";

interface StockChartInnerProps {
  prices: StockPriceDay[];
}

export default function StockChartInner({ prices }: StockChartInnerProps) {
  console.log("📊 Stock chart data:", prices);
  console.log("📊 Sample data point:", prices[0]);
  console.log("📊 Close value type:", typeof prices[0]?.close);
  console.log("📊 Data length:", prices.length);

  // Ensure close values are numbers (handle potential string serialization)
  const chartData = prices.map((p) => ({
    ...p,
    close: Number(p.close),
    open: Number(p.open),
    high: Number(p.high),
    low: Number(p.low),
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={["dataMin - 100", "dataMax + 100"]}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value) => [Number(value).toLocaleString() + "원", "종가"]}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={true}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
