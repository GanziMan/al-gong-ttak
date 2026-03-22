import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관심종목",
  description: "관심 종목을 등록하고 공시를 추적하세요. AI가 새로운 공시를 자동으로 분석해드립니다.",
  openGraph: {
    title: "관심종목 | 알잘딱",
    description: "관심 종목을 등록하고 공시를 추적하세요.",
  },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
