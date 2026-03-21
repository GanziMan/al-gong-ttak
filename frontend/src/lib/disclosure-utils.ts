export const categoryColor: Record<string, string> = {
  호재: "bg-green-100 text-green-800 border-green-200",
  악재: "bg-red-100 text-red-800 border-red-200",
  중립: "bg-yellow-100 text-yellow-800 border-yellow-200",
  단순정보: "bg-gray-100 text-gray-800 border-gray-200",
};

export const categoryBorder: Record<string, string> = {
  호재: "border-l-green-500",
  악재: "border-l-red-500",
  중립: "border-l-yellow-500",
  단순정보: "border-l-gray-400",
};

export function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}
