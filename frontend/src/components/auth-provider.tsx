"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, AuthUser, cachedGet, type DashboardBootstrap, type DividendCalendarEvent, type WatchlistItem } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  logout: () => {},
});

function userFromSession(session: Session): AuthUser {
  const meta = session.user.user_metadata ?? {};
  return {
    id: 0,
    nickname: meta.name ?? meta.full_name ?? "",
    profile_image: meta.avatar_url ?? "",
  };
}

function prewarmUserData() {
  void Promise.allSettled([
    cachedGet<DashboardBootstrap>("/api/dashboard/bootstrap?history_days=14"),
    cachedGet<{ watchlist: WatchlistItem[]; dividend_events: DividendCalendarEvent[] }>("/api/watchlist/overview"),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncUser = useCallback(async (session: Session) => {
    // 즉시 세션 데이터로 유저 표시
    setUser(userFromSession(session));
    setIsLoading(false);
    prewarmUserData();

    // 백그라운드에서 백엔드 유저 정보로 갱신 (내부 id 등)
    try {
      const me = await api.getMe();
      setUser(me);
      prewarmUserData();
    } catch {
      // 백엔드 실패해도 세션 기반 유저는 유지
    }
  }, []);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) {
        syncUser(data.session);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) {
        syncUser(session);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncUser]);

  const logout = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext value={{ user, isLoading, isLoggedIn: !!user, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
