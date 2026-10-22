import type { SkillGapItem } from "../model/compute-skill-gap";

export function SkillGapBox({ items }: { items: SkillGapItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted px-3.5 py-3">
      <p className="text-xs text-muted-foreground">
        지원한 공고에서 자주 나왔지만{" "}
        <span className="font-medium text-foreground">내 프로젝트에는 없는 기술</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.name}
            className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs"
          >
            {item.name}
            <span className="num text-muted-foreground">{item.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
