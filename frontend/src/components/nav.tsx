"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Moon,
  Sun,
  LayoutDashboard,
  FileText,
  Star,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

const links = [
  { href: "/", label: "대시보드" },
  { href: "/watchlist", label: "관심종목" },
  { href: "/disclosures", label: "공시" },
  { href: "/settings", label: "설정" },
];

const tabs = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  { href: "/disclosures", label: "공시", icon: FileText },
  { href: "/watchlist", label: "관심", icon: Star },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      if (!isLoggedIn) return;
      if (document.visibilityState !== "visible") return;
      const since = localStorage.getItem("disclosures_last_seen") || "";
      if (!since) return;
      const data = await api.getDisclosureCount(since);
      setBadgeCount(data.count);
    } catch {
      // silent
    }
  }, [isLoggedIn]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    fetchCount();
    const interval = setInterval(fetchCount, 120_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCount]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <>
      {/* Top header */}
      <header className="glass-nav border-b sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-[10px] font-black text-primary-foreground">A</span>
              </div>
              <span className="text-sm font-bold tracking-wide text-foreground group-hover:text-primary transition-colors">
                ALZALTTAK
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3.5 py-2 text-[13px] font-medium transition-colors rounded-lg",
                    pathname === link.href
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {link.label}
                  {link.href === "/disclosures" && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center px-1 font-bold">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground">
                  {user?.nickname}
                </span>
                <button
                  onClick={logout}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                로그인
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="테마 전환"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden glass-nav border-t" style={{ paddingBottom: "var(--safe-area-bottom)" }}>
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
                <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                  {tab.label}
                </span>
                {tab.href === "/disclosures" && badgeCount > 0 && (
                  <span className="absolute top-1 right-1/4 h-4 min-w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center px-1 font-bold">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
