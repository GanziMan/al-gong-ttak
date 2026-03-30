"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, TrendingUp } from "lucide-react";
import { cachedGet, getCached, type Corp, type PopularStock } from "@/lib/api";

interface PopularStocksProps {
  onAdd: (corp: Corp) => void;
  existingCodes: Set<string>;
}

export function PopularStocks({ onAdd, existingCodes }: PopularStocksProps) {
  const CACHE_KEY = "/api/corps/popular";
  const [stocks, setStocks] = useState<PopularStock[]>(() => getCached<{ stocks: PopularStock[] }>(CACHE_KEY)?.stocks ?? []);

  useEffect(() => {
    cachedGet<{ stocks: PopularStock[] }>("/api/corps/popular", CACHE_KEY)
      .then((d) => setStocks(d.stocks))
      .catch(() => {});
  }, []);

  if (stocks.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-semibold">인기 종목</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {stocks.map((s) => {
          const exists = existingCodes.has(s.corp_code);
          return (
            <button
              key={s.corp_code}
              disabled={exists}
              onClick={() =>
                onAdd({
                  corp_code: s.corp_code,
                  corp_name: s.corp_name,
                  stock_code: s.stock_code,
                })
              }
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors " +
                (exists
                  ? "bg-muted text-muted-foreground cursor-default"
                  : "bg-primary/10 text-primary hover:bg-primary/20")
              }
            >
              {exists ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {s.corp_name}
              <span className="text-[10px] opacity-60">{s.watchers}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
