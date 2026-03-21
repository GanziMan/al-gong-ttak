"use client";

import { Button } from "@/components/ui/button";
import { WatchlistItem } from "@/lib/api";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (corpCode: string) => void;
}

export function WatchlistTable({ items, onRemove }: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/30 py-16 text-center">
        <p className="text-sm text-muted-foreground/60">No stocks in watchlist</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground/40">
          Search above to add stocks you want to track
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 card-gradient overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px_80px] gap-4 border-b border-border/30 bg-muted/20 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          Name
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          Ticker
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          Corp Code
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 text-right">
          Action
        </span>
      </div>
      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.corp_code}
          className="group grid grid-cols-[1fr_100px_100px_80px] gap-4 items-center border-b border-border/15 last:border-0 px-4 py-3 hover:bg-accent/15 transition-all"
        >
          <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
            {item.corp_name}
          </span>
          <span className="font-mono text-[11px] text-primary/70">
            {item.stock_code}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/50">
            {item.corp_code}
          </span>
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => onRemove(item.corp_code)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="border-t border-border/30 bg-muted/10 px-4 py-2">
        <span className="text-[10px] font-mono text-muted-foreground/40">
          {items.length} stock{items.length !== 1 ? "s" : ""} tracked
        </span>
      </div>
    </div>
  );
}
