"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      window.location.href = "/";
    }
  }, [isLoading, isLoggedIn]);

  const handleLogin = () => {
    getSupabase().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">알잘딱</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 기반 공시 분석 서비스
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors cursor-pointer"
          style={{ backgroundColor: "#FEE500", color: "#000000" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 0.5C4.029 0.5 0 3.588 0 7.393c0 2.388 1.558 4.495 3.932 5.734l-1.01 3.693c-.088.322.28.577.556.388L7.555 14.58c.474.056.958.087 1.445.087 4.971 0 9-3.088 9-6.893S13.971 0.5 9 0.5"
              fill="#000000"
            />
          </svg>
          카카오로 시작하기
        </button>

        <p className="text-xs text-muted-foreground/60">
          로그인하면 관심종목, 북마크 등을 저장할 수 있습니다
        </p>
      </div>
    </div>
  );
}
