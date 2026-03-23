"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, Corp } from "@/lib/api";

interface StockSearchProps {
  onSelect: (corp: Corp) => void;
}

const searchCache = new Map<string, Corp[]>();

export function StockSearch({ onSelect }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Corp[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    // 캐시 히트 시 즉시 표시
    const cached = searchCache.get(query);
    if (cached) {
      setResults(cached);
      setOpen(cached.length > 0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchCorps(query);
        searchCache.set(query, data.results);
        setResults(data.results);
        setOpen(data.results.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="종목 검색... (예: 삼성전자)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 sm:h-10 pl-9 bg-card border-border text-sm placeholder:text-muted-foreground/50 rounded-xl focus:border-primary/40 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-primary/60 font-medium">
            검색 중...
          </div>
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1.5 w-full glass-card rounded-2xl overflow-hidden shadow-lg">
          {results.map((corp) => (
            <button
              key={corp.corp_code}
              className="flex w-full items-center justify-between px-4 min-h-[44px] py-3 text-sm hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
              onClick={() => {
                onSelect(corp);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{corp.corp_name}</span>
              <span className="text-[11px] text-muted-foreground/50">{corp.stock_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
