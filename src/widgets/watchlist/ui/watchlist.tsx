"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  applyToApplication,
  deleteApplication,
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { CreateInterestedCompanyDialog } from "@/features/create-interested-company";
import { todayKST } from "@/shared/lib/kst-date";
import { ApplicationDetailDialog } from "@/widgets/kanban-board";

import { computeBestProject } from "../model/compute-best-project";
import { countDueThisWeek, groupByDeadline } from "../model/group-by-deadline";
import { InterestedCompanyRow } from "./interested-company-row";

export function Watchlist({
  companies,
  allProjectMatches,
  myProjectCount,
}: {
  // stage가 'interested'인 지원카드만 넘어온다.
  companies: Application[];
  allProjectMatches: ProjectMatchWithCompany[];
  myProjectCount: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(companies);
  const [prevCompanies, setPrevCompanies] = useState(companies);
  if (companies !== prevCompanies) {
    setPrevCompanies(companies);
    setItems(companies);
  }
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailCompany = items.find((c) => c.id === detailId) ?? null;

  function handleUpdate(id: string, input: UpdateApplicationInput) {
    setItems((prev) =>
      prev.map((company) =>
        company.id === id
          ? {
              ...company,
              ...input,
              techStack: input.techStack ?? company.techStack,
            }
          : company
      )
    );
    updateApplication(id, input).catch(console.error);
  }

  function handleDelete(id: string) {
    const company = items.find((c) => c.id === id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    setDetailId(null);
    deleteApplication(id, { screenshotPaths: company?.screenshotPaths }).catch(console.error);
  }

  // 같은 카드의 단계만 서류로 넘긴다 — 매칭/분석 결과와 스크린샷이 그대로 남는다.
  function handleApply(company: Application) {
    setItems((prev) => prev.filter((c) => c.id !== company.id));
    setDetailId(null);
    applyToApplication(company.id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  const today = todayKST();
  const { upcoming, past } = groupByDeadline(items, today);
  const dueThisWeek = countDueThisWeek(items, today);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-6 pt-10">
        <p className="text-[22px] font-medium tracking-tight">관심 있는 공고를 모아두세요</p>
        <CreateInterestedCompanyDialog />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-6 pt-10 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[22px] font-medium tracking-tight">관심기업 {items.length}곳</p>
          <p className="text-xs text-muted-foreground">이번 주 마감 {dueThisWeek}곳</p>
        </div>
        <CreateInterestedCompanyDialog
          trigger={
            <button
              type="button"
              className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              관심기업 추가
            </button>
          }
        />
      </div>

      <div className="flex flex-col">
        {upcoming.map((company) => (
          <InterestedCompanyRow
            key={company.id}
            company={company}
            bestProject={computeBestProject(company.company, allProjectMatches)}
            onOpenDetail={setDetailId}
            onApply={handleApply}
          />
        ))}
      </div>

      {past.length > 0 && (
        <div className="flex flex-col gap-1 pt-2">
          <p className="text-xs text-muted-foreground">마감 지남</p>
          <div className="flex flex-col">
            {past.map((company) => (
              <InterestedCompanyRow
                key={company.id}
                company={company}
                bestProject={computeBestProject(company.company, allProjectMatches)}
                past
                onOpenDetail={setDetailId}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>
      )}

      <ApplicationDetailDialog
        key={`detail-${detailCompany?.id ?? "none"}`}
        variant="interested"
        company={detailCompany}
        myProjectCount={myProjectCount}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onApply={handleApply}
      />
    </div>
  );
}
