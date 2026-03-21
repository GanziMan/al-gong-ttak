"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/disclosures", label: "Disclosures" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/30 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
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
                    ? "text-foreground bg-accent/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Connected
            </span>
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="flex sm:hidden border-t border-border/30 bg-card/40">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 py-2.5 text-center text-[11px] font-medium transition-colors",
              pathname === link.href
                ? "text-primary bg-primary/5 border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
