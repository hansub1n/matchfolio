"use client";

import { useState } from "react";

const TOP_N = 8;

export function TechStackChips({
  techStackCounts,
}: {
  techStackCounts: { tech: string; count: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const top = techStackCounts.slice(0, TOP_N);
  const rest = techStackCounts.slice(TOP_N);
  const shown = expanded ? techStackCounts : top;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((t) => (
          <span key={t.tech} className="rounded-full border px-2.5 py-1 text-xs">
            {t.tech} <span className="num text-muted-foreground">{t.count}</span>
          </span>
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? "접기" : `${rest.length}개 더 보기`}
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        같은 기술이 2번 이상 나오면 상위 기술을 막대로 보여드려요
      </p>
    </div>
  );
}
