"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // 초기 상태 확인
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "fixed top-14 left-0 right-0 z-50 bg-yellow-500/95 backdrop-blur-sm text-yellow-950 dark:text-yellow-50 py-2 px-4 shadow-lg",
        "animate-in slide-in-from-top duration-300"
      )}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span className="text-[12px] font-medium">
          오프라인 모드 - 캐시된 데이터를 표시하고 있습니다
        </span>
      </div>
    </div>
  );
}
