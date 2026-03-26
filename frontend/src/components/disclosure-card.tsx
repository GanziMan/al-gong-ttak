"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api, Disclosure, SimilarDisclosure } from "@/lib/api";
import { categoryColor, categoryBorder, categoryDot, categoryLabel, formatDate, scoreColor, shouldShowScore } from "@/lib/disclosure-utils";
import { GlossaryHighlight } from "@/components/glossary-highlight";
import { PriceImpactBadge } from "@/components/price-impact-badge";
import { cn } from "@/lib/utils";

interface DisclosureCardProps {
  disclosure: Disclosure;
  isBookmarked?: boolean;
  onToggleBookmark?: (d: Disclosure) => void;
}

function openDisclosure(corpName: string, reportNm: string) {
  const query = encodeURIComponent(`${corpName} ${reportNm} DART 공시`);
  const url = `https://search.naver.com/search.naver?query=${query}`;

  // 보안을 위해 rel="noopener noreferrer" 적용
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}

export function DisclosureCard({ disclosure, isBookmarked, onToggleBookmark }: DisclosureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [similar, setSimilar] = useState<SimilarDisclosure[] | null>(null);
  const [avgPriceChange, setAvgPriceChange] = useState<number | null>(null);
  const [similarLoaded, setSimilarLoaded] = useState(false);
  const analysis = disclosure.analysis;

  useEffect(() => {
    if (expanded && !similarLoaded && disclosure.rcept_no) {
      setSimilarLoaded(true);
      api.getSimilarDisclosures(disclosure.rcept_no).then((data) => {
        setSimilar(data.similar);
        setAvgPriceChange(data.avg_price_change ?? null);
      }).catch(() => setSimilar([]));
    }
  }, [expanded, similarLoaded, disclosure.rcept_no]);
  const cat = analysis?.category || "단순정보";
  const score = analysis?.importance_score ?? 0;
  const catLabel = categoryLabel(cat, score);
  const showScore = shouldShowScore(cat);

  return (
    <article
      className={cn(
        "glass-card rounded-2xl border-l-[3px] transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/50",
        categoryBorder[cat] || "border-l-zinc-300"
      )}
      role="article"
      aria-label={`${disclosure.corp_name} - ${disclosure.report_nm}`}
    >
      <div className="px-4 py-3.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", categoryDot[cat])} />
              <span className="text-[11px] font-semibold text-foreground">
                {disclosure.corp_name}
              </span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {formatDate(disclosure.rcept_dt)}
              </span>
            </div>
            <h3 className="text-[13px] font-medium leading-snug text-foreground/85">
              <button
                type="button"
                className="group/link flex items-center gap-1 min-h-[44px] py-2 -my-2 hover:text-primary active:scale-99 transition-all text-left max-w-full touch-manipulation"
                onClick={(e) => { e.stopPropagation(); openDisclosure(disclosure.corp_name, disclosure.report_nm); }}
              >
                <span className="truncate"><GlossaryHighlight text={disclosure.report_nm} /></span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-60 transition-opacity shrink-0" />
              </button>
            </h3>
          </div>
          <div className="flex items-start gap-1.5 shrink-0">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(disclosure);
                }}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-accent active:scale-95 transition-all touch-manipulation"
                aria-label={isBookmarked ? "북마크 해제" : "북마크"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5 text-muted-foreground/50" />
                )}
              </button>
            )}
            {analysis ? (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn("text-[10px] font-medium rounded-md", categoryColor[cat])}>
                    {catLabel}
                  </Badge>
                  <PriceImpactBadge rceptNo={disclosure.rcept_no} visible={expanded} />
                </div>
                {showScore && (
                  <span className={cn("text-lg font-bold tabular-nums tracking-tighter", scoreColor(score))}>
                    {score}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
                <div className="h-6 w-8 rounded bg-muted animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Action item */}
        {analysis ? (
          <div className="mt-2.5">
            <p className="text-[12px] leading-relaxed text-muted-foreground/70">
              <GlossaryHighlight text={analysis.action_item} />
            </p>

            {/* Expandable AI summary */}
            {expanded && (
              <>
                <div className="mt-3 glass-surface rounded-xl p-3.5">
                  <p className="text-[11px] font-semibold text-primary/70 mb-2">
                    AI 분석 요약
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/75 whitespace-pre-wrap">
                    <GlossaryHighlight text={analysis.summary} />
                  </p>
                </div>

                {/* Similar disclosures */}
                <div className="mt-3 glass-surface rounded-xl p-3.5">
                  <p className="text-[11px] font-semibold text-primary/70 mb-2">
                    유사 공시
                  </p>
                  {similar === null ? (
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted rounded animate-pulse" />
                      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                    </div>
                  ) : similar.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50">유사한 공시가 없습니다</p>
                  ) : (
                    <div className="space-y-2">
                      {similar.map((s) => (
                        <div key={s.rcept_no} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-foreground">{s.corp_name}</span>
                              <Badge variant="outline" className={cn("text-[9px] rounded-md px-1 py-0", categoryColor[s.category])}>
                                {categoryLabel(s.category, s.importance_score)}
                              </Badge>
                              {shouldShowScore(s.category) && (
                                <span className={cn("text-[10px] font-bold tabular-nums", scoreColor(s.importance_score))}>
                                  {s.importance_score}
                                </span>
                              )}
                              {s.price_change_5d !== null && s.price_change_5d !== undefined && (
                                <span className={cn(
                                  "text-[9px] font-semibold tabular-nums",
                                  s.price_change_5d >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                                )}>
                                  {s.price_change_5d > 0 ? "+" : ""}{s.price_change_5d}%
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openDisclosure(s.corp_name, s.report_nm)}
                              className="text-[11px] text-foreground/70 hover:text-primary transition-colors line-clamp-1 text-left"
                            >
                              {s.report_nm}
                            </button>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                            {formatDate(s.rcept_dt)}
                          </span>
                        </div>
                      ))}
                      {avgPriceChange !== null && (
                        <div className="pt-2 border-t border-border/30">
                          <span className="text-[10px] text-muted-foreground">
                            유사 공시 평균 주가 변동 (5일):{" "}
                            <span className={cn(
                              "font-semibold",
                              avgPriceChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                            )}>
                              {avgPriceChange > 0 ? "+" : ""}{avgPriceChange}%
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              className="mt-2.5 min-h-[44px] w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-primary/70 hover:text-primary hover:bg-primary/5 active:scale-98 rounded-lg transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
              onClick={() => setExpanded(!expanded)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded(!expanded);
                }
              }}
              aria-expanded={expanded}
              aria-label={expanded ? "분석 숨기기" : "분석 보기"}
            >
              <span>{expanded ? "분석 숨기기 ▲" : "분석 보기 ▼"}</span>
            </button>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        )}
      </div>
    </article>
  );
}
