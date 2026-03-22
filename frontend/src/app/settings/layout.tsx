import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정",
  description: "알림 설정, 텔레그램 연동, 공시 필터링 조건을 관리하세요.",
  robots: { index: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
