"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, Corp } from "@/lib/api";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const searchCache = new Map<string, { data: Corp[]; ts: number }>();
const SEARCH_CACHE_TTL = 60_000;

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Corp[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().replace(/\s+/g, " ");

  useEffect(() => {
    if (open) {
      // 모달 열릴 때 자동 포커스
      setTimeout(() => inputRef.current?.focus(), 100);
      // body 스크롤 방지
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (normalizedQuery.length < 1) {
      setResults([]);
      return;
    }

    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL && cached.data.length > 0) {
      setResults(cached.data);
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
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [normalizedQuery]);

  const handleSelect = (corp: Corp) => {
    router.push(`/disclosures?corp_code=${corp.corp_code}&corp_name=${encodeURIComponent(corp.corp_name)}`);
    onClose();
    window.scrollTo(0, 0);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="container mx-auto h-full flex flex-col px-4 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent active:scale-95 transition-all touch-manipulation"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">종목 검색</h2>
        </div>

        {/* 검색 입력 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="종목명 또는 코드를 입력하세요 (예: 삼성전자)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 pl-12 pr-4 bg-card border-border text-base placeholder:text-muted-foreground/50 rounded-2xl focus:border-primary/40 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-accent rounded-lg transition-colors touch-manipulation"
            >
              <X className="h-4 w-4 text-muted-foreground/50" />
            </button>
          )}
        </div>

        {/* 검색 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm text-muted-foreground">검색 중...</span>
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              &quot;{query}&quot; 검색 결과가 없습니다
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              다른 검색어를 입력해보세요
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            <div className="space-y-2">
              {results.map((corp) => (
                <button
                  key={corp.corp_code}
                  onClick={() => handleSelect(corp)}
                  className="w-full glass-card rounded-2xl p-4 hover:bg-accent/50 active:scale-98 transition-all touch-manipulation"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-base">
                        {corp.corp_name}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {corp.corp_code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-primary/80">
                        {corp.stock_code}
                      </span>
                      <svg
                        className="h-5 w-5 text-muted-foreground/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 안내 텍스트 */}
        {!query && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground/60">
                종목명을 입력하여 검색하세요
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
