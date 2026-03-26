import { DashboardSummary, Disclosure } from "@/lib/api";
import { HomeClient } from "./home-client";

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getPublicData(): Promise<{
  summary: DashboardSummary | null;
  disclosures: Disclosure[];
}> {
  try {
    const [dashRes, discRes] = await Promise.all([
      fetch(`${API_BASE}/api/dashboard/public`, {
        next: { revalidate: 300 },
      }),
      fetch(`${API_BASE}/api/disclosures/public?days=7`, {
        next: { revalidate: 300 },
      }),
    ]);

    const summary: DashboardSummary | null = dashRes.ok
      ? await dashRes.json()
      : null;
    const discData = discRes.ok
      ? await discRes.json()
      : { disclosures: [] };

    return {
      summary,
      disclosures: (discData.disclosures || []).slice(0, 10) as Disclosure[],
    };
  } catch {
    return { summary: null, disclosures: [] };
  }
}

export default async function HomePage() {
  const { summary, disclosures } = await getPublicData();
  return <HomeClient summary={summary} disclosures={disclosures} />;
}
