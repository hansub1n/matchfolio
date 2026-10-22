"use client";

import { cn } from "cn";

import type { InterestedCompany } from "@/entities/interested-company";
import { type DdayTier } from "@/shared/lib/dday";
import { formatDeadlineBadge } from "@/shared/lib/format-deadline";
import { todayKST } from "@/shared/lib/kst-date";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";

import type { BestProject } from "../model/compute-best-project";

function formatTechSummary(techStack: string[]): string {
  const shown = techStack.slice(0, 3);
  const rest = techStack.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` +${rest}` : "");
}

// 보드 카드(application-card.tsx)의 D-day 배지 색 규칙과 동일하게 맞춘다.
function deadlineBadgeClasses(tier: DdayTier): string {
  switch (tier) {
    case "urgent":
      return "bg-urgent text-urgent-foreground";
    case "soon":
      return "bg-highlight text-highlight-foreground";
    default:
      return "text-muted-foreground";
  }
}

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function InterestedCompanyRow({
  company,
  bestProject,
  past = false,
  onOpenDetail,
  onApply,
}: {
  company: InterestedCompany;
  bestProject: BestProject | null;
  past?: boolean;
  onOpenDetail?: (id: string) => void;
  onApply?: (company: InterestedCompany) => void;
}) {
  const deadlineBadge = formatDeadlineBadge(company.deadline, todayKST());

  function handleRowClick() {
    onOpenDetail?.(company.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      onOpenDetail?.(company.id);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      className="group grid cursor-pointer grid-cols-[28px_1fr_auto] items-start gap-3 rounded-lg border-t border-border px-2 py-4 last:border-b hover:bg-accent"
    >
      <CompanyMonogram company={company.company} size={28} muted={past} />

      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px]">
          <span className={cn("font-medium", past && "text-muted-foreground")}>
            {company.company}
          </span>
          {company.position && (
            <span className="text-muted-foreground"> · {company.position}</span>
          )}
        </p>
        {company.techStack.length > 0 && (
          <p className="text-xs text-muted-foreground">{formatTechSummary(company.techStack)}</p>
        )}
        {bestProject && (
          <p className="text-xs text-muted-foreground">
            잘 맞는 프로젝트 ·{" "}
            <span className="text-foreground">
              {bestProject.projectName} {bestProject.fitScore}점
            </span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden group-hover:inline-flex"
          onClick={(e) => {
            stopClick(e);
            onApply?.(company);
          }}
        >
          지원하기
        </Button>
        {deadlineBadge && (
          <span
            className={cn(
              "num rounded px-1.5 py-0.5 text-[11px]",
              deadlineBadgeClasses(deadlineBadge.tier)
            )}
          >
            {deadlineBadge.label}
          </span>
        )}
      </div>
    </div>
  );
}
