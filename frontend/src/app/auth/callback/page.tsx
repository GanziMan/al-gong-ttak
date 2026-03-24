"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  useEffect(() => {
    // Supabase SDK가 URL hash에서 자동으로 세션 처리
    // 세션 확인 후 홈으로 redirect
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/";
      } else {
        // hash fragment 처리를 위해 잠시 대기
        const timeout = setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        return () => clearTimeout(timeout);
      }
    });
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">로그인 처리 중...</p>
    </div>
  );
}
