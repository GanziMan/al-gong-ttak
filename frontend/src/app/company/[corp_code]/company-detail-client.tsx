"use client";

import Link from "next/link";
import { Building2, Globe, User, FileText, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CompanyInfo,
  DividendCalendarEvent,
  DividendYear,
  FinancialYear,
  ShareholderInfo,
  StockPriceDay,
} from "@/lib/api";
import { DividendSummaryCard } from "@/components/dividend-summary-card";
import { FinancialChart } from "@/components/financial-chart";
import { DividendTable } from "@/components/dividend-table";
import { ShareholderTable } from "@/components/shareholder-table";
import { StockPriceChart } from "@/components/stock-price-chart";
import { useAuth } from "@/components/auth-provider";

interface CompanyDetailClientProps {
  corpCode: string;
  company: CompanyInfo | null;
  financials: FinancialYear[];
  dividends: DividendYear[];
  dividendEvent: DividendCalendarEvent | null;
  shareholders: ShareholderInfo[];
  initialPrices: StockPriceDay[];
}

export function CompanyDetailClient({
  corpCode,
  company,
  financials,
  dividends,
  dividendEvent,
  shareholders,
  initialPrices,
}: CompanyDetailClientProps) {
  const { isLoggedIn } = useAuth();

  if (!company && financials.length === 0 && dividends.length === 0 && shareholders.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm text-muted-foreground">기업 정보를 불러올 수 없습니다.</p>
        <Link href={isLoggedIn ? "/watchlist" : "/"} className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            {isLoggedIn ? "관심종목으로 돌아가기" : "홈으로 돌아가기"}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {company ? (
        <div className="glass-card rounded-2xl px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {company.corp_name || corpCode}
              </h1>
              {company.corp_name_eng && (
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {company.corp_name_eng}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
                {company.stock_code && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {company.stock_code}
                  </span>
                )}
                {company.ceo_nm && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {company.ceo_nm}
                  </span>
                )}
                {company.est_dt && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {company.est_dt.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")} 설립
                  </span>
                )}
                {company.hm_url?.trim() && (
                  <a
                    href={company.hm_url.startsWith("http") ? company.hm_url : `https://${company.hm_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    홈페이지
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={`/disclosures?corp_code=${corpCode}`}>
                  <Button variant="outline" size="sm" className="text-[11px]">
                    <FileText className="h-3.5 w-3.5" />
                    공시 보기
                  </Button>
                </Link>
                <Link href="/dividends">
                  <Button variant="outline" size="sm" className="text-[11px]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    배당 일정
                  </Button>
                </Link>
                {isLoggedIn && (
                  <Link href="/watchlist">
                    <Button variant="ghost" size="sm" className="text-[11px]">
                      <Star className="h-3.5 w-3.5" />
                      관심종목
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton className="h-24 rounded-2xl" />
      )}

      <StockPriceChart corpCode={corpCode} initialPrices={initialPrices} />

      {company ? (
        <DividendSummaryCard
          event={dividendEvent}
          corpName={company.corp_name}
          stockCode={company.stock_code}
        />
      ) : (
        <Skeleton className="h-52 rounded-2xl" />
      )}

      {financials.length > 0 ? (
        <FinancialChart data={financials} />
      ) : (
        <Skeleton className="h-72 rounded-2xl" />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {dividends.length > 0 ? (
          <DividendTable data={dividends} />
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}
        {shareholders.length > 0 ? (
          <ShareholderTable data={shareholders} />
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}
      </div>
    </div>
  );
}
