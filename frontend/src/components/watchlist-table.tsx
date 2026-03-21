"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WatchlistItem } from "@/lib/api";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (corpCode: string) => void;
}

export function WatchlistTable({ items, onRemove }: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          관심종목이 없습니다
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          위 검색창에서 종목을 검색하여 추가하세요
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>종목명</TableHead>
          <TableHead>종목코드</TableHead>
          <TableHead>기업코드</TableHead>
          <TableHead className="w-24 text-right">관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.corp_code}>
            <TableCell className="font-medium">{item.corp_name}</TableCell>
            <TableCell className="text-muted-foreground">
              {item.stock_code}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.corp_code}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemove(item.corp_code)}
              >
                삭제
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
