"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, Globe, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  fetchWithRevalidate,
  CompanyInfo,
  FinancialYear,
  DividendYear,
  ShareholderInfo,
} from "@/lib/api";
import { FinancialChart } from "@/components/financial-chart";
import { DividendTable } from "@/components/dividend-table";
import { ShareholderTable } from "@/components/shareholder-table";

export default function CompanyDetailPage() {
  const params = useParams();
  const corpCode = params.corp_code as string;

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [financials, setFinancials] = useState<FinancialYear[] | null>(null);
  const [dividends, setDividends] = useState<DividendYear[] | null>(null);
  const [shareholders, setShareholders] = useState<ShareholderInfo[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!corpCode) return;

    // summary 호출 (백엔드에서 병렬 처리) + 캐시 지원
    fetchWithRevalidate<{ company: CompanyInfo; financials: FinancialYear[]; dividends: DividendYear[]; shareholders: ShareholderInfo[] }>(
      `/api/company/${corpCode}/summary`,
      (fresh) => {
        setCompany(fresh.company);
        setFinancials(fresh.financials);
        setDividends(fresh.dividends);
        setShareholders(fresh.shareholders);
      },
      `company_${corpCode}`,
    )
      .then((cached) => {
        if (cached) {
          setCompany(cached.company);
          setFinancials(cached.financials);
          setDividends(cached.dividends);
          setShareholders(cached.shareholders);
        }
      })
      .catch(() => {
        // summary 실패 → 개별 API 병렬 폴백
        Promise.all([
          api.getCompanyFinancials(corpCode)
            .then((r) => setFinancials(r.financials))
            .catch(() => setFinancials([])),
          api.getCompanyDividends(corpCode)
            .then((r) => setDividends(r.dividends))
            .catch(() => setDividends([])),
          api.getCompanyShareholders(corpCode)
            .then((r) => setShareholders(r.shareholders))
            .catch(() => setShareholders([])),
        ]).then(() => {
          // 개별 호출도 전부 빈 데이터면 에러 표시
          setError((prev) => prev);
        });
        setError(true);
      });
  }, [corpCode]);

  if (error && !company && !financials && !dividends && !shareholders) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm text-muted-foreground">기업 정보를 불러올 수 없습니다.</p>
        <Link href="/watchlist" className="mt-3 inline-block">
          <Button variant="outline" size="sm">관심종목으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기업 헤더 */}
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
            </div>
            <Link href={`/disclosures?corp_code=${corpCode}`}>
              <Button variant="outline" size="sm" className="text-[11px] shrink-0">
                공시 보기
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Skeleton className="h-24 rounded-2xl" />
      )}

      {/* 로딩 안내 */}
      {(!financials || !dividends || !shareholders) && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          <p className="text-[12px] text-muted-foreground/60">
            재무 데이터를 불러오고 있습니다. 첫 조회 시 다소 시간이 걸릴 수 있습니다.
          </p>
        </div>
      )}

      {/* 재무 차트 */}
      {financials ? (
        <FinancialChart data={financials} />
      ) : (
        <Skeleton className="h-72 rounded-2xl" />
      )}

      {/* 배당 + 대주주 */}
      <div className="grid gap-4 md:grid-cols-2">
        {dividends ? (
          <DividendTable data={dividends} />
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}
        {shareholders ? (
          <ShareholderTable data={shareholders} />
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}
      </div>
    </div>
  );
}
