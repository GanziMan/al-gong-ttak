"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const ALL_CATEGORIES = ["호재", "악재", "중립", "단순정보"];

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
        setError("설정을 불러올 수 없습니다. 백엔드 서버를 확인하세요.");
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
      setError("설정 저장에 실패했습니다.");
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
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">로딩중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-sm text-muted-foreground">
          알림과 필터링 설정을 관리하세요
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">텔레그램 알림</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="telegram-toggle">알림 활성화</Label>
            <Switch
              id="telegram-toggle"
              checked={settings.telegram_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, telegram_enabled: checked })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-id">텔레그램 Chat ID</Label>
            <Input
              id="chat-id"
              value={settings.telegram_chat_id}
              onChange={(e) =>
                setSettings({ ...settings, telegram_chat_id: e.target.value })
              }
              placeholder="텔레그램 Chat ID를 입력하세요"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림 필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>알림 카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={
                    settings.alert_categories.includes(cat)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              선택한 카테고리의 공시만 알림을 받습니다
            </p>
          </div>

          <div className="space-y-2">
            <Label>최소 중요도 점수</Label>
            <Select
              value={String(settings.min_importance_score)}
              onValueChange={(v) =>
                v && setSettings({ ...settings, min_importance_score: Number(v) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">전체 (0점 이상)</SelectItem>
                <SelectItem value="20">20점 이상</SelectItem>
                <SelectItem value="30">30점 이상</SelectItem>
                <SelectItem value="50">50점 이상</SelectItem>
                <SelectItem value="80">80점 이상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>공시 조회 기간</Label>
            <Select
              value={String(settings.disclosure_days)}
              onValueChange={(v) =>
                v && setSettings({ ...settings, disclosure_days: Number(v) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1일</SelectItem>
                <SelectItem value="3">3일</SelectItem>
                <SelectItem value="7">7일</SelectItem>
                <SelectItem value="14">14일</SelectItem>
                <SelectItem value="30">30일</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "저장중..." : "설정 저장"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">저장되었습니다</span>
        )}
      </div>
    </div>
  );
}
