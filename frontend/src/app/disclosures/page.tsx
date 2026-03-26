import { Disclosure } from "@/lib/api";
import { DisclosuresClient } from "./disclosures-client";

export const dynamic = 'force-dynamic'; // 완전 동적 렌더링

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getPublicDisclosures(): Promise<Disclosure[]> {
  try {
    // 7일치 공시를 가져와서 클라이언트에서 날짜/카테고리/점수 필터링
    const res = await fetch(`${API_BASE}/api/disclosures/public?days=7`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.disclosures || []) as Disclosure[];
  } catch {
    return [];
  }
}

export default async function DisclosuresPage() {
  const initialDisclosures = await getPublicDisclosures();
  return <DisclosuresClient initialDisclosures={initialDisclosures} />;
}
