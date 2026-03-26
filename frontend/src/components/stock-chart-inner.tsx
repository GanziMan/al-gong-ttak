"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { StockPriceDay } from "@/lib/api";

interface StockChartInnerProps {
  prices: StockPriceDay[];
}

export default function StockChartInner({ prices }: StockChartInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 192 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({ width, height: 192 });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  console.log("📊 Stock chart data:", prices);
  console.log("📊 Sample:", prices[0]);
  console.log("📊 Container width:", dimensions.width);

  if (!prices || prices.length === 0) {
    return (
      <div className="h-48 w-full flex items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  const chartData = prices.map((p) => ({
    date: p.date,
    close: Number(p.close),
  }));

  const closeValues = chartData.map(d => d.close);
  const minClose = Math.min(...closeValues);
  const maxClose = Math.max(...closeValues);
  const padding = (maxClose - minClose) * 0.1 || 100;

  console.log("📊 Will render chart:", dimensions.width > 0, "width:", dimensions.width);

  return (
    <div ref={containerRef} className="h-48 w-full">
      {dimensions.width > 0 && (
        <LineChart
          width={dimensions.width}
          height={dimensions.height}
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 5, left: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="#94a3b8"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={[minClose - padding, maxClose + padding]}
            tickFormatter={(v: number) => v.toLocaleString()}
            stroke="#94a3b8"
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
            }}
            formatter={(value) => [Number(value).toLocaleString() + "원", "종가"]}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "#6366f1" }}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </div>
  );
}
