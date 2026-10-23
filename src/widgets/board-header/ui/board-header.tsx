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
    <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3">
      <p className="text-[17px] font-medium tracking-tight">
        {headline.prefix}
        {headline.highlight && (
          <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
            {headline.highlight}
          </span>
        )}
        {headline.suffix}
      </p>

      <div className="flex items-center gap-4">
        <BoardHeatmap week={thisWeek} today={today} todayCount={todayCount} />
        <CreateApplicationDialog
          trigger={
            <button
              type="button"
              className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              공고 추가
            </button>
          }
        />
      </div>
    </div>
  );
}
