"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { fetchWithRevalidate, getCached, HistoryDataPoint } from "@/lib/api";
import { formatDateShort } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

const ComposedChart = dynamic(
  () => import("recharts").then((m) => m.ComposedChart),
  { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-foreground/70 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[11px] text-muted-foreground">{p.name}</span>
          <span className="text-[11px] font-semibold text-foreground ml-auto tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const PERIOD_OPTIONS = [
  { label: "7일", value: 7 },
  { label: "14일", value: 14 },
  { label: "30일", value: 30 },
];

interface DisclosureHistoryChartProps {
  initialHistory?: HistoryDataPoint[];
}

export function DisclosureHistoryChart({ initialHistory }: DisclosureHistoryChartProps) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<HistoryDataPoint[]>(() => {
    if (initialHistory) {
      return initialHistory;
    }
    const cached = getCached<{ history: HistoryDataPoint[] }>(`history_14`);
    return cached?.history ?? [];
  });
  const [loading, setLoading] = useState(() => !initialHistory && !getCached("history_14"));

  useEffect(() => {
    if (days === 14 && initialHistory) {
      return;
    }
    fetchWithRevalidate<{ history: HistoryDataPoint[] }>(
      `/api/dashboard/history?days=${days}`,
      (fresh) => setData(fresh.history),
      `history_${days}`,
    )
      .then((cached) => { if (cached) setData(cached.history); })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [days, initialHistory]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary/60" />
          <h2 className="text-[13px] font-semibold text-foreground/80">공시 추이</h2>
        </div>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                if (days === opt.value) return;
                setLoading(true);
                setDays(opt.value);
              }}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors",
                days === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-[200px] rounded-lg bg-muted animate-pulse" />
        ) : data.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/50 text-center py-16">
            분석된 공시 데이터가 없습니다
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data.map((d) => ({ ...d, dateLabel: formatDateShort(d.date) }))}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="count" name="공시 수" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="avg_score" name="평균 점수" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
