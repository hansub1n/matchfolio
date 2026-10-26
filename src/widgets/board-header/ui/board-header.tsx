import { buildHeatmap, type Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { CreateApplicationDialog } from "@/features/create-application";
import { todayKST } from "@/shared/lib/kst-date";

import { buildWeekSummary } from "../model/build-week-summary";
import { BoardHeatmap } from "./board-heatmap";

export function BoardHeader({
  applications,
  schedules,
}: {
  applications: Application[];
  schedules: Schedule[];
}) {
  const today = todayKST();
  const { headline } = buildWeekSummary(applications, schedules, today);
  const todayCount = applications.filter((app) => app.appliedAt === today).length;
  const heatmap = buildHeatmap(applications, 52, today);
  const thisWeek = heatmap.weeks.at(-1) ?? [];

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <p className="text-[15px] font-medium tracking-tight sm:text-[17px]">
        {headline.prefix}
        {headline.highlight && (
          <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
            {headline.highlight}
          </span>
        )}
        {headline.suffix}
      </p>

      <div className="flex shrink-0 items-center gap-4">
        {/* 휴대폰은 폭이 좁아 이번 주 잔디는 빼고 "공고 추가"만 — 잔디는 통계 탭에 있다. */}
        <div className="max-sm:hidden">
            <BoardHeatmap week={thisWeek} today={today} todayCount={todayCount} />
        </div>
        <CreateApplicationDialog
          trigger={
            <button
              type="button"
              className="rounded-full bg-primary px-3 py-1.5 text-xs max-sm:px-3.5 max-sm:py-2 max-sm:text-[13px] text-primary-foreground"
            >
              공고 추가
            </button>
          }
        />
      </div>
    </div>
  );
}
