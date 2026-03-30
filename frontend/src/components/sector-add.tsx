"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, ChevronDown, Layers } from "lucide-react";
import { cachedGet, getCached, type Corp, type SectorInfo } from "@/lib/api";

interface SectorAddProps {
  onAdd: (corp: Corp) => void;
  existingCodes: Set<string>;
}

export function SectorAdd({ onAdd, existingCodes }: SectorAddProps) {
  const CACHE_KEY = "/api/corps/sectors";
  const [sectors, setSectors] = useState<SectorInfo[]>(() => getCached<{ sectors: SectorInfo[] }>(CACHE_KEY)?.sectors ?? []);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    cachedGet<{ sectors: SectorInfo[] }>("/api/corps/sectors", CACHE_KEY)
      .then((d) => setSectors(d.sectors))
      .catch(() => {});
  }, []);

  if (sectors.length === 0) return null;

  const activeSector = sectors.find((s) => s.name === selected);

  async function handleAddAll() {
    if (!activeSector) return;
    for (const c of activeSector.corps) {
      if (!existingCodes.has(c.corp_code)) {
        onAdd(c);
        // 각 추가 사이에 짧은 딜레이를 두어 낙관적 업데이트가 적용되도록
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  return (
    <div className="glass-card rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-semibold">업종별 추가</h3>
      </div>

      {/* Sector chips */}
      <div className="flex flex-wrap gap-2">
        {sectors.map((s) => (
          <button
            key={s.name}
            onClick={() => setSelected(selected === s.name ? null : s.name)}
            className={
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors " +
              (selected === s.name
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground")
            }
          >
            {s.name}
            <ChevronDown
              className={
                "h-3 w-3 transition-transform " +
                (selected === s.name ? "rotate-180" : "")
              }
            />
          </button>
        ))}
      </div>

      {/* Expanded sector corps */}
      {activeSector && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">
              {activeSector.name} 기업
            </span>
            <button
              onClick={handleAddAll}
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              전체 추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSector.corps.map((c) => {
              const exists = existingCodes.has(c.corp_code);
              return (
                <button
                  key={c.corp_code}
                  disabled={exists}
                  onClick={() => onAdd(c)}
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors " +
                    (exists
                      ? "bg-muted text-muted-foreground cursor-default"
                      : "bg-accent hover:bg-accent/80 text-foreground")
                  }
                >
                  {exists ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {c.corp_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
