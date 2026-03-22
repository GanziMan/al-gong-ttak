"use client";

import { Coins } from "lucide-react";
import { DividendYear } from "@/lib/api";

interface DividendTableProps {
  data: DividendYear[];
}

export function DividendTable({ data }: DividendTableProps) {
  // 배당 데이터에서 주요 항목 추출
  const rows = data
    .filter((d) => d.dividends.length > 0)
    .map((d) => {
      const items = d.dividends;
      const dps = items.find((i) => i.se === "주당 현금배당금(원)")?.thstrm ?? "-";
      const yieldPct = items.find((i) => i.se === "현금배당수익률(%)")?.thstrm ?? "-";
      const payout = items.find((i) => i.se === "현금배당성향(%)")?.thstrm ?? "-";
      return { year: d.year, dps, yieldPct, payout };
    });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary/60" />
        <h2 className="text-[13px] font-semibold text-foreground/80">배당 이력</h2>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/50 text-center py-8">
            배당 데이터가 없습니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">연도</th>
                  <th className="text-right py-2 px-4 font-medium">주당배당금</th>
                  <th className="text-right py-2 px-4 font-medium">배당수익률</th>
                  <th className="text-right py-2 pl-4 font-medium">배당성향</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year} className="border-b border-border/10 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-foreground">{r.year}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-foreground/80">{r.dps}원</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-foreground/80">{r.yieldPct}%</td>
                    <td className="py-2.5 pl-4 text-right tabular-nums text-foreground/80">{r.payout}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
