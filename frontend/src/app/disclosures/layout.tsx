import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공시 피드",
  description: "관심종목의 최신 DART 공시를 AI가 분석한 결과를 확인하세요. 호재/악재 분류, 중요도 점수, 핵심 요약을 제공합니다.",
  openGraph: {
    title: "공시 피드 | 알잘딱",
    description: "관심종목의 최신 DART 공시를 AI가 분석한 결과를 확인하세요.",
  },
};

export default function DisclosuresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
