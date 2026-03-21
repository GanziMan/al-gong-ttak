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
    <div className="flex flex-wrap gap-3">
      <Select value={category} onValueChange={(v) => v && onCategoryChange(v)}>
        <SelectTrigger className="w-[140px]">
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
        <SelectTrigger className="w-[120px]">
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
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="중요도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">전체 중요도</SelectItem>
          <SelectItem value="20">20점 이상</SelectItem>
          <SelectItem value="50">50점 이상</SelectItem>
          <SelectItem value="80">80점 이상</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
