import type { Metadata } from "next";
import { getPublicDividendData } from "@/app/public-data";
import { DividendsClient } from "./dividends-client";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "배당 일정",
  description: "국내 상장사 배당 기준일, 최근 배당 변화, 배당 흐름을 한눈에 확인하세요. 비로그인 사용자는 공개 배당 일정, 로그인 사용자는 관심종목 기준 배당 일정을 볼 수 있습니다.",
  keywords: [
    "배당 일정",
    "배당 기준일",
    "배당 캘린더",
    "배당 이력",
    "국내 주식 배당",
    "상장사 배당",
    "배당일",
  ],
  alternates: {
    canonical: "/dividends",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "배당 일정 | 공시딱",
    description: "국내 상장사 배당 기준일과 최근 배당 흐름을 한눈에 확인하세요.",
    url: "/dividends",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "배당 일정 | 공시딱",
    description: "국내 상장사 배당 기준일과 최근 배당 흐름을 한눈에 확인하세요.",
  },
};

export default async function DividendsPage() {
  const data = await getPublicDividendData(6);

  return <DividendsClient initialPublicEvents={data?.events ?? []} />;
}
