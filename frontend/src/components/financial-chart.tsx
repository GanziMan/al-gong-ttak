"use client";

import dynamic from "next/dynamic";
import { TrendingUp } from "lucide-react";
import { FinancialYear } from "@/lib/api";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

const COLORS: Record<string, string> = {
  "매출액": "#94A3B8",
  "영업이익": "#F59E0B",
  "당기순이익": "#10B981",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-foreground/70 mb-1.5">{label}년</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[p.name] }} />
          <span className="text-[11px] text-muted-foreground">{p.name}</span>
          <span className="text-[11px] font-semibold text-foreground ml-auto tabular-nums">{formatBillion(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function formatBillion(value: number): string {
  if (value === 0) return "0";
  const billion = value / 100000000;
  if (Math.abs(billion) >= 10000) return `${(billion / 10000).toFixed(1)}조`;
  return `${billion.toFixed(0)}억`;
}

function getAccount(accounts: Array<{ account: string; amount: number }>, name: string): number {
  return accounts.find((a) => a.account === name)?.amount ?? 0;
}

interface FinancialChartProps {
  data: FinancialYear[];
}

export function FinancialChart({ data }: FinancialChartProps) {
  const chartData = data
    .filter((d) => d.accounts.length > 0)
    .map((d) => ({
      year: d.year,
      매출액: getAccount(d.accounts, "매출액"),
      영업이익: getAccount(d.accounts, "영업이익"),
      당기순이익: getAccount(d.accounts, "당기순이익"),
    }));

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary/60" />
        <h2 className="text-[13px] font-semibold text-foreground/80">재무 추이</h2>
      </div>
      <div className="p-4">
        {chartData.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/50 text-center py-12">
            재무 데이터가 없습니다
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={formatBillion}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="매출액" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="영업이익" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="당기순이익" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
