import { getSupabase } from "./supabase";

export async function getToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}
