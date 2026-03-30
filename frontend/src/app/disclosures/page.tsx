import type { Metadata } from "next";
import { DisclosuresClient } from "./disclosures-client";
import type { Disclosure } from "@/lib/api";
import { getPublicDisclosuresData } from "../public-data";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ corp_name?: string }>;
}): Promise<Metadata> {
  const { corp_name } = await searchParams;
  if (corp_name) {
    const title = `${corp_name} 공시 - 공시딱`;
    const description = `${corp_name}의 최신 공시를 AI가 분석한 결과를 확인하세요.`;
    return {
      title,
      description,
      openGraph: { title, description },
    };
  }
  const title = "공시딱 | 공시 피드";
  const description = "상장기업의 최신 공시(기업 공개 보고서)를 AI가 분석한 결과를 확인하세요. 호재/악재 분류, 중요도 점수, 핵심 요약을 제공합니다.";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function DisclosuresPage() {
  let initialDisclosures: Disclosure[] = [];
  let initialPendingAnalysis = 0;

  const data = await getPublicDisclosuresData(30);
  if (data) {
    initialDisclosures = data.disclosures;
    initialPendingAnalysis = data.pendingAnalysis;
  }

  return (
    <DisclosuresClient
      initialDisclosures={initialDisclosures}
      initialPendingAnalysis={initialPendingAnalysis}
    />
  );
}
