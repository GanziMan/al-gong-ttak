"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, AuthUser } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 초기 세션 확인
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) {
        fetchUser();
      } else {
        setIsLoading(false);
      }
    });

    // 세션 변경 리스너
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUser();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

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
