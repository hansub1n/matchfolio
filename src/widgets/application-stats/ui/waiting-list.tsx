"use client";

import { ChevronRight } from "lucide-react";

import { formatDateTime } from "@/shared/lib/format-date-time";
import { CompanyMonogram } from "@/shared/ui/company-monogram";

import type { InProgressItem } from "../model/compute-stats";

const STAGE_LABEL: Record<InProgressItem["stage"], string> = {
  // compute-stats가 관심 단계를 빼서 실제로는 안 나오지만 타입상 필요.
  interested: "관심",
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
  return formatDateTime(item.scheduledAt) ?? "일정 미정";
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
            <CompanyMonogram company={item.company} size={24} />
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
