"use client";

import { useEffect, useRef, useState } from "react";

import type { HeatmapCell } from "@/entities/application";
import { cn } from "cn";

const CELL_SIZE = 16;
const WEEKDAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function cellBackground(count: number) {
  const level = heatLevel(count);
  return level === 0 ? "var(--heat-0)" : `var(--heat-${level})`;
}

function cellTooltip(date: string, count: number) {
  const [, month, day] = date.split("-");
  const weekday = WEEKDAY_NAMES_KO[new Date(`${date}T00:00:00`).getDay()];
  const label = `${Number(month)}.${Number(day)} (${weekday})`;
  return count > 0 ? `${label} · ${count}곳 지원` : `${label} · 지원 없음`;
}

// 이번 주(월~일) 고정 7칸 — buildHeatmap(applications, N, today).weeks.at(-1)로
// 얻은 마지막 주를 그대로 받는다. 색 외에 다른 방식(테두리 등)으로 "오늘"을
// 강조하지 않는다 — 오늘 표시는 아래 요일 라벨 쪽에서만 한다.
export function BoardHeatmap({
  week,
  today,
  todayCount,
}: {
  week: HeatmapCell[];
  today: string;
  todayCount: number;
}) {
  const prevCountRef = useRef(todayCount);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (todayCount > prevCountRef.current) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 200);
      prevCountRef.current = todayCount;
      return () => clearTimeout(timeout);
    }
    prevCountRef.current = todayCount;
  }, [todayCount]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {week.map((cell) => {
          const isToday = cell.date === today;
          return (
            <div
              key={cell.date}
              title={cellTooltip(cell.date, cell.count)}
              className={cn("rounded-[4px]", isToday && pulse && "animate-heatmap-pulse")}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cellBackground(cell.count),
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-1">
        {week.map((cell) => {
          const isToday = cell.date === today;
          const weekday = WEEKDAY_NAMES_KO[new Date(`${cell.date}T00:00:00`).getDay()];
          return (
            <span
              key={cell.date}
              className={cn(
                "text-center text-[10px] leading-none",
                isToday ? "font-medium text-foreground" : "text-muted-foreground"
              )}
              style={{ width: CELL_SIZE }}
            >
              {weekday}
            </span>
          );
        })}
      </div>
    </div>
  );
}
