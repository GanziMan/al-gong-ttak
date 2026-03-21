"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, AppSettings } from "@/lib/api";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = ["호재", "악재", "중립", "단순정보"];
const CATEGORY_EN: Record<string, string> = {
  호재: "Bullish",
  악재: "Bearish",
  중립: "Neutral",
  단순정보: "Info",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch {
        setError("Unable to load settings. Check backend server.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    if (!settings) return;
    const cats = settings.alert_categories.includes(cat)
      ? settings.alert_categories.filter((c) => c !== cat)
      : [...settings.alert_categories, cat];
    setSettings({ ...settings, alert_categories: cats });
  }

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-[12px] text-muted-foreground/60 mt-0.5">
          Configure notifications and alert filters
        </p>
      </div>

      {/* Telegram Section */}
      <div className="rounded-xl border border-border/30 card-gradient overflow-hidden">
        <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
          <span className="text-sm">✈</span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Telegram Notifications
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="telegram-toggle" className="text-[13px]">Enable notifications</Label>
            <Switch
              id="telegram-toggle"
              checked={settings.telegram_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, telegram_enabled: checked })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-id" className="text-[11px] text-muted-foreground/60">Chat ID</Label>
            <Input
              id="chat-id"
              value={settings.telegram_chat_id}
              onChange={(e) =>
                setSettings({ ...settings, telegram_chat_id: e.target.value })
              }
              placeholder="Enter Telegram Chat ID"
              className="h-9 card-gradient border-border/30 text-sm font-mono rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Alert Filters Section */}
      <div className="rounded-xl border border-border/30 card-gradient overflow-hidden">
        <div className="border-b border-border/30 px-4 py-3 flex items-center gap-2">
          <span className="text-sm">◈</span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Alert Filters
          </h2>
        </div>
        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground/60">Alert categories</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const active = settings.alert_categories.includes(cat);
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-all text-[11px] rounded-lg",
                      active
                        ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"
                        : "text-muted-foreground/60 border-border/30 hover:border-border/50 hover:text-muted-foreground"
                    )}
                    onClick={() => toggleCategory(cat)}
                  >
                    {CATEGORY_EN[cat]} ({cat})
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/60">Minimum importance score</Label>
            <Select
              value={String(settings.min_importance_score)}
              onValueChange={(v) =>
                v && setSettings({ ...settings, min_importance_score: Number(v) })
              }
            >
              <SelectTrigger className="h-9 w-[160px] text-sm card-gradient border-border/30 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All (0+)</SelectItem>
                <SelectItem value="20">Score 20+</SelectItem>
                <SelectItem value="30">Score 30+</SelectItem>
                <SelectItem value="50">Score 50+</SelectItem>
                <SelectItem value="80">Score 80+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/60">Disclosure lookback period</Label>
            <Select
              value={String(settings.disclosure_days)}
              onValueChange={(v) =>
                v && setSettings({ ...settings, disclosure_days: Number(v) })
              }
            >
              <SelectTrigger className="h-9 w-[160px] text-sm card-gradient border-border/30 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-9 text-[11px] uppercase tracking-[0.12em] rounded-lg"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-[12px] text-emerald-400 font-medium">Saved successfully</span>
        )}
      </div>
    </div>
  );
}
