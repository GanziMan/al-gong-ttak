"use client";

import { useState, useEffect, useCallback } from "react";
import { StockSearch } from "@/components/stock-search";
import { WatchlistTable } from "@/components/watchlist-table";
import { api, Corp, WatchlistItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWatchlist = useCallback(async () => {
    try {
      const data = await api.getWatchlist();
      setWatchlist(data.watchlist);
      setError("");
    } catch {
      setError("Unable to load watchlist. Check backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  async function handleAdd(corp: Corp) {
    try {
      const data = await api.addToWatchlist({
        corp_code: corp.corp_code,
        corp_name: corp.corp_name,
        stock_code: corp.stock_code,
      });
      setWatchlist(data.watchlist);
    } catch {
      setError("Failed to add stock.");
    }
  }

  async function handleRemove(corpCode: string) {
    try {
      const data = await api.removeFromWatchlist(corpCode);
      setWatchlist(data.watchlist);
    } catch {
      setError("Failed to remove stock.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-[12px] text-muted-foreground/60 mt-0.5">
          Track and manage your stock portfolio
        </p>
      </div>

      <StockSearch onSelect={handleAdd} />

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-52 rounded-xl" />
      ) : (
        <WatchlistTable items={watchlist} onRemove={handleRemove} />
      )}
    </div>
  );
}
