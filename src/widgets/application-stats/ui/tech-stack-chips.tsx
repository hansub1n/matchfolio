const TOP_N = 8;

export function TechStackChips({
  techStackCounts,
}: {
  techStackCounts: { tech: string; count: number }[];
}) {
  const top = techStackCounts.slice(0, TOP_N);
  const restCount = techStackCounts.length - top.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {top.map((t) => (
          <span
            key={t.tech}
            className="rounded-full border px-2.5 py-1 text-xs"
          >
            {t.tech} <span className="num text-muted-foreground">{t.count}</span>
          </span>
        ))}
        {restCount > 0 && (
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            +{restCount}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        같은 기술이 2번 이상 나오면 상위 기술을 막대로 보여드려요
      </p>
    </div>
  );
}
