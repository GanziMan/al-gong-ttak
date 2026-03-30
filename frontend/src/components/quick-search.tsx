"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, CorpSearchPreview } from "@/lib/api";
import { cn } from "@/lib/utils";

const searchCache = new Map<string, { data: CorpSearchPreview[]; ts: number }>();
const SEARCH_CACHE_TTL = 60_000;

function formatDividendChange(change: CorpSearchPreview["change_vs_prev_year"]) {
  if (change === "increase") return "증액";
  if (change === "flat") return "동결";
  if (change === "decrease") return "감액";
  if (change === "no_dividend") return "무배당";
  if (change === "new") return "신규";
  return "변화 미확인";
}

export function QuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CorpSearchPreview[]>([]);
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
        const data = await api.searchCorpPreview(normalizedQuery);
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

  const handleCompanySelect = (corp: CorpSearchPreview) => {
    router.push(`/company/${corp.corp_code}`);
    setQuery("");
    setOpen(false);
    setFocused(false);
    window.scrollTo(0, 0);
  };

  const handleDisclosureSelect = (corp: CorpSearchPreview) => {
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
              <div
                key={corp.corp_code}
                className="border-b border-border/20 px-3 py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="min-w-0 flex-1 text-left hover:bg-accent/40 rounded-lg px-1 py-1 transition-colors"
                    onClick={() => handleCompanySelect(corp)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-foreground text-[13px]">
                        {corp.corp_name}
                      </span>
                      <span className="text-[11px] text-primary/60 font-mono shrink-0">
                        {corp.stock_code}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>최근 공시 {corp.recent_disclosure_count}건</span>
                      <span>DPS {corp.recent_dps > 0 ? corp.recent_dps.toLocaleString() : "-"}</span>
                      <span>{formatDividendChange(corp.change_vs_prev_year)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDisclosureSelect(corp)}
                    className="shrink-0 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    공시
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
