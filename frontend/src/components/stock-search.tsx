"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { api, Corp } from "@/lib/api";

interface StockSearchProps {
  onSelect: (corp: Corp) => void;
}

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

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchCorps(query);
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-sm">
          ⌕
        </span>
        <Input
          placeholder="Search stocks... (e.g. Samsung)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-8 card-gradient border-border/30 text-sm placeholder:text-muted-foreground/40 rounded-xl focus:border-primary/40 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-primary/60 font-medium">
            Searching...
          </div>
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-border/30 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {results.map((corp) => (
            <button
              key={corp.corp_code}
              className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-accent/30 transition-all border-b border-border/15 last:border-0"
              onClick={() => {
                onSelect(corp);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{corp.corp_name}</span>
              <span className="font-mono text-[11px] text-muted-foreground/50">{corp.stock_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
