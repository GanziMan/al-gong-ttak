"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/lib/api";
import { categoryColor, formatDate } from "@/lib/disclosure-utils";
import { cn } from "@/lib/utils";

interface ImportantDisclosuresProps {
  disclosures: Disclosure[];
}

export function ImportantDisclosures({
  disclosures,
}: ImportantDisclosuresProps) {
  if (disclosures.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">중요 공시</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {disclosures.map((d) => {
          const cat = d.analysis?.category || "단순정보";
          return (
            <div
              key={d.rcept_no}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.report_nm}</p>
                <p className="text-muted-foreground">
                  {d.corp_name} &middot; {formatDate(d.rcept_dt)}
                </p>
                {d.analysis?.action_item && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.analysis.action_item}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-xs", categoryColor[cat])}
              >
                {cat} {d.analysis?.importance_score}점
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface RecentTimelineProps {
  disclosures: Disclosure[];
}

export function RecentTimeline({ disclosures }: RecentTimelineProps) {
  if (disclosures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 공시</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            관심종목을 추가하면 최근 공시가 여기에 표시됩니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 공시</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {disclosures.map((d) => (
            <div
              key={d.rcept_no}
              className="flex items-center gap-3 text-sm"
            >
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(d.rcept_dt)}
              </span>
              <span className="font-medium">{d.corp_name}</span>
              <span className="truncate text-muted-foreground">
                {d.report_nm}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
