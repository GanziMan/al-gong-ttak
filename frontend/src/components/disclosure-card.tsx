"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/lib/api";
import { categoryColor, categoryBorder, formatDate } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

interface DisclosureCardProps {
  disclosure: Disclosure;
}

export function DisclosureCard({ disclosure }: DisclosureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const analysis = disclosure.analysis;
  const cat = analysis?.category || "단순정보";

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow hover:shadow-md",
        categoryBorder[cat] || "border-l-gray-400"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base leading-tight">
              {disclosure.report_nm}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {disclosure.corp_name}
              </span>
              <span>{formatDate(disclosure.rcept_dt)}</span>
            </div>
          </div>
          {analysis && (
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn("text-xs", categoryColor[cat])}
              >
                {cat}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {analysis.importance_score}점
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      {analysis && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {analysis.action_item}
          </p>
          {expanded && (
            <div className="mt-3 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {analysis.summary}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-auto px-0 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "접기" : "AI 요약 보기"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
