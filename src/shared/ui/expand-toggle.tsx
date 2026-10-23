export function ExpandToggle({
  expanded,
  hiddenCount,
  onToggle,
  collapsedLabel,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
  collapsedLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="self-start text-[11px] text-muted-foreground hover:text-foreground"
    >
      {expanded ? "접기" : (collapsedLabel ?? `${hiddenCount}개 더 보기`)}
    </button>
  );
}
