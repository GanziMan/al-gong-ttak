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
      <Input
        placeholder="종목명 검색 (예: 삼성전자)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">
          검색중...
        </div>
      )}
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((corp) => (
            <button
              key={corp.corp_code}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                onSelect(corp);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium">{corp.corp_name}</span>
              <span className="text-muted-foreground">{corp.stock_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
