const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
];
const OTHER_COLOR = "#898781"; // muted gray — not a categorical slot, signals "everything else"
const GAP_DEG = 2;

export function TechStackDonut({
  techStackCounts,
}: {
  techStackCounts: { tech: string; count: number }[];
}) {
  const top5 = techStackCounts.slice(0, 5);
  const otherCount = techStackCounts.slice(5).reduce((sum, t) => sum + t.count, 0);

  const segments = [
    ...top5.map((t, i) => ({
      label: t.tech,
      count: t.count,
      color: CATEGORICAL_COLORS[i],
    })),
    ...(otherCount > 0 ? [{ label: "기타", count: otherCount, color: OTHER_COLOR }] : []),
  ];

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const totalGap = GAP_DEG * segments.length;
  const available = Math.max(360 - totalGap, 0);

  let cursor = 0;
  const stops: string[] = [];
  for (const segment of segments) {
    const segmentDeg = (segment.count / total) * available;
    stops.push(`${segment.color} ${cursor}deg ${cursor + segmentDeg}deg`);
    cursor += segmentDeg;
    stops.push(`transparent ${cursor}deg ${cursor + GAP_DEG}deg`);
    cursor += GAP_DEG;
  }

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative size-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="absolute inset-[22%] rounded-full bg-card" />
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-sm">{segment.label}</span>
            <span className="text-sm font-semibold tabular-nums">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
