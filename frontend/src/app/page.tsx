import { HomeClient } from "./home-client";
import { getPublicLandingData } from "./public-data";

// 랜딩은 ISR로 미리 생성해 초기 로딩 지연을 줄임
export const revalidate = 300;

export default async function HomePage() {
  const data = await getPublicLandingData();

  return <HomeClient summary={data?.summary ?? null} disclosures={data?.disclosures ?? []} />;
}
