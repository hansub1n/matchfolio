const TOP_N = 8;

export function TechStackBars({
  techStackCounts,
  total,
}: {
  techStackCounts: { tech: string; count: number }[];
  total: number;
}) {
  const top = techStackCounts.slice(0, TOP_N);
  const otherCount = techStackCounts.slice(TOP_N).reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="flex flex-col gap-2.5">
      {top.map((t) => (
        <div key={t.tech} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-sm">{t.tech}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${total > 0 ? (t.count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="num w-4 shrink-0 text-right text-sm text-muted-foreground">
            {t.count}
          </span>
        </div>
      ))}
      {otherCount > 0 && (
        <p className="pt-1 text-[11px] text-muted-foreground">그 외 기타 {otherCount}건</p>
      )}
    </div>
  );
}
