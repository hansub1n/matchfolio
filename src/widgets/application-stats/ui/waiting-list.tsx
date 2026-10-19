"use client";

import { ChevronRight } from "lucide-react";

import { monogramColor } from "@/shared/lib/monogram-color";

import type { InProgressItem } from "../model/compute-stats";

const STAGE_LABEL: Record<InProgressItem["stage"], string> = {
  document: "서류 검토 중",
  coding_test: "코딩테스트",
  interview: "면접",
};

function describeStage(item: InProgressItem) {
  if (item.stage !== "interview") return STAGE_LABEL[item.stage];
  return item.roundLabel ? `${item.roundLabel} 면접` : STAGE_LABEL.interview;
}

function describeSchedule(item: InProgressItem) {
  if (item.stage === "document") return null;
  return item.scheduledAt
    ? new Date(item.scheduledAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : "일정 미정";
}

export function WaitingList({
  items,
  onSelect,
}: {
  items: InProgressItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="pb-1 text-xs font-medium text-muted-foreground">기다리는 중</p>
      {items.map((item) => {
        const schedule = describeSchedule(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex items-center gap-2.5 py-1.5 text-left"
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-medium"
              style={{ backgroundColor: monogramColor(item.company) }}
            >
              {item.company.charAt(0)}
            </span>
            <span className="truncate text-sm font-medium">{item.company}</span>
            <span className="truncate text-sm text-muted-foreground">
              {describeStage(item)}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {schedule && <span className="text-xs text-muted-foreground">{schedule}</span>}
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
