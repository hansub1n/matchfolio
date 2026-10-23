import { useState } from "react";

export function sliceExpandable<T>(items: T[], limit: number, expanded: boolean) {
  const canExpand = items.length > limit;
  return {
    visible: expanded || !canExpand ? items : items.slice(0, limit),
    canExpand,
    hiddenCount: Math.max(items.length - limit, 0),
  };
}

// "N개 더 보기" ↔ "접기" 목록. 펼친 뒤에도 다시 접을 수 있어야 해서 펼침 여부를
// 개수가 아니라 boolean으로 들고 있는다.
export function useExpandable<T>(items: T[], limit: number) {
  const [expanded, setExpanded] = useState(false);
  return {
    ...sliceExpandable(items, limit, expanded),
    expanded,
    toggle: () => setExpanded((v) => !v),
  };
}
