"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";

import { buildMonthLabels, type YearHeatmapData } from "@/entities/application";
import { todayKST } from "@/shared/lib/kst-date";

const WEEKDAY_ROW_LABELS = ["월", "", "수", "", "금", "", ""];
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

// 한 그리드 안에(요일 라벨 1열 + 월 라벨 1행 + 실제 칸) 전부 넣어서, 셀마다
// aspect-ratio:1을 줘 폭이 줄어들면 높이도 같이 줄어들게 한다 — 그래서 컨테이너
// 폭에 맞춰 늘어나거나 줄어도 항상 정사각 칸을 유지하면서 스크롤 없이 꽉 찬다.
export function ActivityHeatmap({
  heatmap,
  celebrateDate,
}: {
  heatmap: YearHeatmapData;
  // 첫 기록 애니메이션 대상 칸(오늘). 없으면 애니메이션 없음.
  celebrateDate?: string | null;
}) {
  const weekCount = heatmap.weeks.length;
  const monthLabels = buildMonthLabels(heatmap.weeks);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 오늘이 든 주(올해가 아니면 마지막 주). 휴대폰에서 1월부터 보이면 이번 달까지 한참 넘겨야 해서 처음부터 그쪽을 보여준다.
  const today = todayKST();
  const todayWeek = heatmap.weeks.findIndex((week) => week.some((cell) => cell.date === today));
  const focusWeek = todayWeek === -1 ? weekCount - 1 : todayWeek;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    // 이번 주가 화면 오른쪽 끝 근처(오른쪽에 2주 정도 여유)에 오도록.
    const columnWidth = el.scrollWidth / (weekCount + 1);
    el.scrollLeft = Math.max(0, (focusWeek + 4) * columnWidth - el.clientWidth);
  }, [focusWeek, weekCount]);

  return (
    <div className="flex flex-col gap-2">
      {/* 53주가 휴대폰 폭에 다 들어가면 칸이 점처럼 작아져서, 최소 폭을 두고 가로로 넘겨 본다. */}
      <div ref={scrollRef} className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-[3px]"
        style={{ gridTemplateColumns: `auto repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {monthLabels.map((m) => (
          <span
            key={m.columnIndex}
            className="self-end pb-0.5 text-[9.5px] whitespace-nowrap text-muted-foreground"
            style={{ gridColumn: m.columnIndex + 2, gridRow: 1 }}
          >
            {m.label}
          </span>
        ))}

        {/* 요일 열 맨 위(월 라벨 줄)도 가려서, 넘길 때 월 이름이 요일 열 위로 지나가지 않게. */}
        <span aria-hidden className="sticky left-0 z-10 bg-background" style={{ gridColumn: 1, gridRow: 1 }} />
        {WEEKDAY_ROW_LABELS.map((label, dayIndex) => (
          <span
            key={dayIndex}
            // 잔디를 옆으로 넘겨도 요일(월·수·금)이 왼쪽에 남게 붙여둔다. 지나가는 칸을 가리도록 배경색을 깐다.
            className="sticky left-0 z-10 flex h-full items-center justify-end bg-background pr-1 text-[9.5px] leading-none text-muted-foreground"
            style={{ gridColumn: 1, gridRow: dayIndex + 2 }}
          >
            {label}
          </span>
        ))}

        {heatmap.weeks.map((week, weekIndex) =>
          week.map((cell, dayIndex) =>
            cell.isOutOfYear ? null : (
              <div
                key={cell.date}
                title={cellTooltip(cell.date, cell.count)}
                className={cn("rounded-[2px]", cell.date === celebrateDate && "animate-first-record-pop")}
                style={{
                  gridColumn: weekIndex + 2,
                  gridRow: dayIndex + 2,
                  aspectRatio: "1",
                  backgroundColor: cellBackground(cell.count),
                }}
              />
            )
          )
        )}
      </div>
      </div>

      {/* 범례는 넘김 밖 오른쪽 아래에 고정 — 잔디를 넘겨도 항상 보인다. */}
      <div className="flex items-center justify-end gap-1 text-[9.5px] text-muted-foreground">
        <span>적음</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className="size-[10px] rounded-[2px]"
            style={{ backgroundColor: level === 0 ? "var(--heat-0)" : `var(--heat-${level})` }}
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
