"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DisclosureFiltersProps {
  category: string;
  days: number;
  minScore: number;
  onCategoryChange: (v: string) => void;
  onDaysChange: (v: number) => void;
  onMinScoreChange: (v: number) => void;
}

export function DisclosureFilters({
  category,
  days,
  minScore,
  onCategoryChange,
  onDaysChange,
  onMinScoreChange,
}: DisclosureFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mr-0.5">
        Filter
      </span>
      <Select value={category} onValueChange={(v) => v && onCategoryChange(v)}>
        <SelectTrigger className="h-8 w-[130px] text-xs card-gradient border-border/30 rounded-lg">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="호재">Bullish</SelectItem>
          <SelectItem value="악재">Bearish</SelectItem>
          <SelectItem value="중립">Neutral</SelectItem>
          <SelectItem value="단순정보">Info</SelectItem>
        </SelectContent>
      </Select>

      <Select value={String(days)} onValueChange={(v) => v && onDaysChange(Number(v))}>
        <SelectTrigger className="h-8 w-[100px] text-xs card-gradient border-border/30 rounded-lg">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 Day</SelectItem>
          <SelectItem value="3">3 Days</SelectItem>
          <SelectItem value="7">7 Days</SelectItem>
          <SelectItem value="14">14 Days</SelectItem>
          <SelectItem value="30">30 Days</SelectItem>
        </SelectContent>
      </Select>

      <Select value={String(minScore)} onValueChange={(v) => v && onMinScoreChange(Number(v))}>
        <SelectTrigger className="h-8 w-[120px] text-xs card-gradient border-border/30 rounded-lg">
          <SelectValue placeholder="Score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">All Scores</SelectItem>
          <SelectItem value="20">Score 20+</SelectItem>
          <SelectItem value="50">Score 50+</SelectItem>
          <SelectItem value="80">Score 80+</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
