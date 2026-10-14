const SEGMENT_OPACITIES = [1, 0.8, 0.6, 0.45, 0.3];

export function StatusDistribution({
  statusCounts,
  total,
}: {
  statusCounts: { label: string; count: number }[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-sm bg-muted">
        {statusCounts.map((status, i) => {
          const widthPercent = total > 0 ? (status.count / total) * 100 : 0;
          if (widthPercent === 0) return null;
          return (
            <div
              key={status.label}
              className="h-full bg-foreground"
              style={{ width: `${widthPercent}%`, opacity: SEGMENT_OPACITIES[i] }}
              title={`${status.label} ${status.count}건`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {statusCounts.map((status, i) => (
          <div key={status.label} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-sm bg-foreground"
              style={{ opacity: SEGMENT_OPACITIES[i] }}
            />
            <span className="text-sm">{status.label}</span>
            <span className="text-sm font-semibold tabular-nums">{status.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
