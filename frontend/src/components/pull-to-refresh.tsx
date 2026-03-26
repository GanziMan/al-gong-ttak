"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const onRefreshRef = useRef(onRefresh);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  // onRefresh 참조 업데이트 (의존성 배열에서 제외하기 위함)
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // iOS bounce scroll 고려하여 <= 0으로 변경
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0 || window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        setPulling(true);
        // 당기는 거리를 제한하고, 저항감 추가
        const adjustedDistance = Math.min(distance * 0.5, MAX_PULL);
        setPullDistance(adjustedDistance);

        // 당기는 동안 스크롤 방지
        if (adjustedDistance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= PULL_THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
            setPulling(false);
          }, 500);
        }
      } else {
        setPullDistance(0);
        setPulling(false);
      }
      startY.current = 0;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
    // onRefresh를 의존성에서 제거하여 메모리 누수 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullDistance, refreshing]);

  const opacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const scale = Math.min(0.5 + (pullDistance / PULL_THRESHOLD) * 0.5, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none"
        style={{
          transform: `translateY(${Math.min(pullDistance, PULL_THRESHOLD)}px)`,
          transition: pulling && !refreshing ? "none" : "transform 0.3s ease-out",
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm shadow-lg",
            refreshing && "animate-spin"
          )}
          style={{
            opacity,
            transform: `scale(${scale})`,
          }}
        >
          <RefreshCw className="h-5 w-5 text-white" />
        </div>
      </div>

      {children}
    </div>
  );
}
