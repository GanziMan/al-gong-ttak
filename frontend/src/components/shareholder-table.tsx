"use client";

import { Users } from "lucide-react";
import { ShareholderInfo } from "@/lib/api";

interface ShareholderTableProps {
  data: ShareholderInfo[];
}

export function ShareholderTable({ data }: ShareholderTableProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary/60" />
        <h2 className="text-[13px] font-semibold text-foreground/80">최대주주 현황</h2>
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/50 text-center py-8">
            대주주 데이터가 없습니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">성명</th>
                  <th className="text-left py-2 px-4 font-medium">관계</th>
                  <th className="text-right py-2 px-4 font-medium">보유주식수</th>
                  <th className="text-right py-2 pl-4 font-medium">지분율</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, i) => (
                  <tr key={i} className="border-b border-border/10 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-foreground">{s.name}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.relation}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-foreground/80">{s.shares_raw}</td>
                    <td className="py-2.5 pl-4 text-right tabular-nums text-foreground/80">{s.ownership_pct}%</td>
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
