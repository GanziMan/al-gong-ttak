import { CompanyDetailClient } from "./company-detail-client";
import { getCompanyDividendCalendar, getCompanyStockPrices, getCompanySummary } from "./data";

interface Props {
  params: Promise<{ corp_code: string }>;
}

export default async function CompanyDetailPage({ params }: Props) {
  const { corp_code } = await params;

  const [summary, dividendCalendar, stockPrices] = await Promise.all([
    getCompanySummary(corp_code),
    getCompanyDividendCalendar(corp_code),
    getCompanyStockPrices(corp_code),
  ]);

  return (
    <CompanyDetailClient
      corpCode={corp_code}
      company={summary?.company ?? null}
      financials={summary?.financials ?? []}
      dividends={summary?.dividends ?? []}
      dividendEvent={dividendCalendar?.event ?? null}
      shareholders={summary?.shareholders ?? []}
      initialPrices={(stockPrices?.prices ?? []).slice().reverse()}
    />
  );
}
