"use client";

import { memo, useState, useRef } from "react";
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Disclosure, DisclosurePreview } from "@/lib/api";
import {
  categoryColor,
  categoryBorder,
  categoryDot,
  categoryLabel,
  formatDate,
  scoreColor,
  shouldShowScore,
} from "@/lib/disclosure-utils";
import { GlossaryHighlight } from "@/components/glossary-highlight";
import { PriceImpactBadge } from "@/components/price-impact-badge";
import { cn } from "@/lib/utils";

type DisclosureCardItem = Disclosure | DisclosurePreview;

interface DisclosureCardProps {
  disclosure: DisclosureCardItem;
  isBookmarked?: boolean;
  onToggleBookmark?: (d: DisclosureCardItem) => void;
}

function openDisclosure(corpName: string, reportNm: string) {
  const query = encodeURIComponent(`${corpName} ${reportNm} DART 공시`);
  const url = `https://search.naver.com/search.naver?query=${query}`;

  // 보안을 위해 rel="noopener noreferrer" 적용
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
}

function DisclosureCardInner({
  disclosure,
  isBookmarked,
  onToggleBookmark,
}: DisclosureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const analysis = disclosure.analysis;
  const cat = analysis?.category || "단순정보";
  const score = analysis?.importance_score ?? 0;
  const catLabel = categoryLabel(cat, score);
  const showScore = shouldShowScore(cat);

  return (
    <article
      ref={cardRef}
      className={cn(
        "glass-card rounded-2xl border-l-[3px] transition-all hover:shadow-md",
        categoryBorder[cat] || "border-l-zinc-300",
      )}
      role="article"
      aria-label={`${disclosure.corp_name} - ${disclosure.report_nm}`}>
      <div className="px-4 py-3.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  categoryDot[cat],
                )}
              />
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
                onClick={(e) => {
                  e.stopPropagation();
                  openDisclosure(disclosure.corp_name, disclosure.report_nm);
                }}>
                <span className="truncate">
                  <GlossaryHighlight text={disclosure.report_nm} />
                </span>
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
                className="flex select-none items-center justify-center rounded-lg hover:bg-accent active:scale-95 transition-all touch-manipulation"
                aria-label={isBookmarked ? "북마크 해제" : "북마크"}>
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
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium rounded-md",
                      categoryColor[cat],
                    )}>
                    {catLabel}
                  </Badge>
                  <span className="hidden sm:inline-flex">
                    <PriceImpactBadge
                      rceptNo={disclosure.rcept_no}
                      visible={expanded}
                    />
                  </span>
                </div>
                {showScore && (
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums tracking-tighter",
                      scoreColor(score),
                    )}>
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

            {/* Mobile price impact */}
            <div className="sm:hidden mt-2">
              <PriceImpactBadge
                rceptNo={disclosure.rcept_no}
                visible={expanded}
              />
            </div>

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
              </>
            )}

            <button
              className="mt-2.5 min-h-[44px] w-full select-none flex items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-primary/70 transition-all touch-manipulation hover:bg-primary/5 hover:text-primary active:scale-98 focus:outline-none focus:ring-0"
              onClick={() => {
                const next = !expanded;
                setExpanded(next);
                if (next) {
                  setTimeout(
                    () =>
                      cardRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      }),
                    100,
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const next = !expanded;
                  setExpanded(next);
                  if (next) {
                    setTimeout(
                      () =>
                        cardRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                        }),
                      100,
                    );
                  }
                }
              }}
              aria-expanded={expanded}
              aria-label={expanded ? "분석 숨기기" : "분석 보기"}>
              <span>{expanded ? "분석 숨기기 ▲" : "분석 보기 ▼"}</span>
            </button>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] text-muted-foreground/60">
                AI 분석 중...
              </span>
            </div>
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        )}
      </div>
    </article>
  );
}

export const DisclosureCard = memo(DisclosureCardInner);
DisclosureCard.displayName = "DisclosureCard";
