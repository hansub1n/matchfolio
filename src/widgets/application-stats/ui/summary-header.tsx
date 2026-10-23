import type { ApplicationStats } from "../model/compute-stats";

const EMPTY = "—";

export function SummaryHeader({ stats }: { stats: ApplicationStats }) {
  const now = new Date();
  const today = `${now.getMonth() + 1}.${now.getDate()}`;
  const { headline } = stats;
  // 지원이 0건이면 0이 아니라 "—" — 0은 "결과가 0건"으로 읽혀서 아직 없다는 뜻과 다르다.
  const isEmpty = stats.total === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">전체 기간</span>
        <span className="text-xs text-muted-foreground">{today} 기준</span>
      </div>
      <p className="text-[26px] leading-snug font-medium tracking-tight">
        {headline.prefix}
        {headline.highlight && (
          <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
            {headline.highlight}
          </span>
        )}
        {headline.suffix}
      </p>
      <div className="flex gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">최종 합격</span>
          <span className="text-lg font-medium tabular-nums">{isEmpty ? EMPTY : stats.finalPassedCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">탈락</span>
          <span className="text-lg font-medium tabular-nums">{isEmpty ? EMPTY : stats.failedCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">서류 통과율</span>
          {isEmpty ? (
            <span className="text-lg font-medium tabular-nums">{EMPTY}</span>
          ) : stats.showPercent ? (
            <span className="text-lg font-medium tabular-nums">{stats.funnel[1].percent}%</span>
          ) : (
            <span className="text-xs text-muted-foreground">5건부터 표시</span>
          )}
        </div>
      </div>
    </div>
  );
}
