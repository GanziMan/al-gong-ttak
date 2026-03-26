export const categoryColor: Record<string, string> = {
  호재: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  악재: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  중립: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  단순정보: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

export const categoryBorder: Record<string, string> = {
  호재: "border-l-emerald-500",
  악재: "border-l-red-500",
  중립: "border-l-amber-500",
  단순정보: "border-l-zinc-300 dark:border-l-zinc-600",
};

export const categoryDot: Record<string, string> = {
  호재: "bg-emerald-500",
  악재: "bg-red-500",
  중립: "bg-amber-500",
  단순정보: "bg-zinc-400",
};

export function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

export function formatDateShort(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export function scoreColor(score: number) {
  if (score >= 80) return "text-red-600 dark:text-red-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  if (score >= 20) return "text-blue-600 dark:text-blue-400";
  return "text-zinc-400 dark:text-zinc-500";
}

export function categoryLabel(category: string, score: number) {
  if (category === "호재") {
    if (score >= 80) return "강한 호재";
    if (score >= 60) return "호재";
    if (score >= 40) return "약한 호재";
    return "중립(호재 가능)";
  }
  if (category === "악재") {
    if (score >= 80) return "강한 악재";
    if (score >= 60) return "악재";
    if (score >= 40) return "약한 악재";
    return "중립(악재 가능)";
  }
  if (category === "중립") {
    if (score >= 70) return "중립(변동성 주의)";
    return "중립";
  }
  return category;
}
