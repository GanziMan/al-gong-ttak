import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "카카오 로그인으로 알잘딱을 시작하세요. 관심종목 추적, AI 공시 분석, 텔레그램 알림 기능을 이용할 수 있습니다.",
  openGraph: {
    title: "로그인 | 알잘딱",
    description: "카카오 로그인으로 알잘딱을 시작하세요.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
