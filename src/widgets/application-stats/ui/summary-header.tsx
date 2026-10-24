import type { ApplicationStats, Headline } from "../model/compute-stats";

const EMPTY = "—";

export function StatsHeadline({ headline }: { headline: Headline }) {
  return (
    <>
      {headline.prefix}
      {headline.highlight && (
        <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
          {headline.highlight}
        </span>
      )}
      {headline.suffix}
    </>
  );
}

export function SummaryMetrics({ stats }: { stats: ApplicationStats }) {
  // 지원이 0건이면 0이 아니라 "—" — 0은 "결과가 0건"으로 읽혀서 아직 없다는 뜻과 다르다.
  const isEmpty = stats.total === 0;

  return (
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
          <span className="flex h-7 items-center text-xs text-muted-foreground">5건부터 표시</span>
        )}
      </div>
    </div>
  );
}
