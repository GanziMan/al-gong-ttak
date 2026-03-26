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
    <div className="w-full sm:w-auto">
      <div className="mb-1 sm:hidden">
        <span className="text-[11px] font-medium text-muted-foreground">필터</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2.5">
        <span className="hidden text-[11px] font-medium text-muted-foreground mr-0.5 shrink-0 sm:inline">
          필터
        </span>
        <Select value={category} onValueChange={(v) => v && onCategoryChange(v)}>
          <SelectTrigger className="h-9 w-full min-w-0 text-xs bg-card border-border rounded-xl sm:w-[130px] sm:shrink-0">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="호재">호재</SelectItem>
            <SelectItem value="악재">악재</SelectItem>
            <SelectItem value="중립">중립</SelectItem>
            <SelectItem value="단순정보">단순정보</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(days)} onValueChange={(v) => v && onDaysChange(Number(v))}>
          <SelectTrigger className="h-9 w-full min-w-0 text-xs bg-card border-border rounded-xl sm:w-[100px] sm:shrink-0">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1일</SelectItem>
            <SelectItem value="3">3일</SelectItem>
            <SelectItem value="7">7일</SelectItem>
            <SelectItem value="14">14일</SelectItem>
            <SelectItem value="30">30일</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(minScore)} onValueChange={(v) => v && onMinScoreChange(Number(v))}>
          <SelectTrigger className="h-9 w-full min-w-0 text-xs bg-card border-border rounded-xl sm:w-[120px] sm:shrink-0">
            <SelectValue placeholder="점수" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">전체 점수</SelectItem>
            <SelectItem value="20">20점 이상</SelectItem>
            <SelectItem value="50">50점 이상</SelectItem>
            <SelectItem value="80">80점 이상</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
