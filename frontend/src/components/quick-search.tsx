"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, Corp } from "@/lib/api";
import { cn } from "@/lib/utils";

const searchCache = new Map<string, { data: Corp[]; ts: number }>();
const SEARCH_CACHE_TTL = 60_000;

export function QuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Corp[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().replace(/\s+/g, " ");

  useEffect(() => {
    if (normalizedQuery.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL && cached.data.length > 0) {
      setResults(cached.data);
      setOpen(cached.data.length > 0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchCorps(normalizedQuery);
        if (data.results.length > 0) {
          searchCache.set(normalizedQuery, { data: data.results, ts: Date.now() });
        } else {
          searchCache.delete(normalizedQuery);
        }
        setResults(data.results);
        setOpen(data.results.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [normalizedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (corp: Corp) => {
    router.push(`/disclosures?corp_code=${corp.corp_code}&corp_name=${encodeURIComponent(corp.corp_name)}`);
    setQuery("");
    setOpen(false);
    setFocused(false);
    window.scrollTo(0, 0);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        <Input
          placeholder="종목 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className={cn(
            "h-9 w-32 pl-8 pr-7 bg-accent/50 border-border/50 text-[12px] placeholder:text-muted-foreground/40 rounded-lg transition-all",
            "focus:w-56 focus:bg-card focus:border-primary/40",
            focused && "w-56 bg-card"
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground/50" />
          </button>
        )}
        {loading && (
          <div className="absolute -bottom-5 left-0 text-[10px] text-primary/60">
            검색 중...
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full min-w-[16rem] glass-card rounded-xl overflow-hidden shadow-xl border border-border/50">
          <div className="max-h-80 overflow-y-auto">
            {results.slice(0, 8).map((corp) => (
              <button
                key={corp.corp_code}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0 touch-manipulation"
                onClick={() => handleSelect(corp)}
              >
                <span className="font-medium text-foreground text-[13px]">
                  {corp.corp_name}
                </span>
                <span className="text-[11px] text-primary/60 font-mono">
                  {corp.stock_code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
