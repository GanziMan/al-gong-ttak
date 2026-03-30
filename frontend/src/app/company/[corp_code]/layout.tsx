import type { Metadata } from "next";
import { getCompanySummary } from "./data";

interface Props {
  params: Promise<{ corp_code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { corp_code } = await params;

  try {
    const data = await getCompanySummary(corp_code);
    if (!data) return { title: "기업 정보" };
    const name = data.company?.corp_name ?? corp_code;

    return {
      title: `${name} - 기업분석`,
      description: `${name}의 재무제표, 배당, 대주주 현황을 확인하세요.`,
      openGraph: {
        title: `${name} 기업분석 | 공시딱`,
        description: `${name}의 재무제표, 배당, 대주주 현황`,
      },
    };
  } catch {
    return { title: "기업 정보" };
  }
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
