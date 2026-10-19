"use client";

import { buildMonthLabels, type YearHeatmapData } from "@/entities/application";

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
export function ActivityHeatmap({ heatmap }: { heatmap: YearHeatmapData }) {
  const weekCount = heatmap.weeks.length;
  const monthLabels = buildMonthLabels(heatmap.weeks);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-[3px]"
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

        {WEEKDAY_ROW_LABELS.map((label, dayIndex) => (
          <span
            key={dayIndex}
            className="self-center pr-1 text-right text-[9.5px] leading-none text-muted-foreground"
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
                className="rounded-[2px]"
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

      <div className="flex justify-end gap-1 text-[9.5px] text-muted-foreground">
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
