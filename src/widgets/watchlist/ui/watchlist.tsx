"use client";

import { useState } from "react";

import {
  deleteInterestedCompany,
  updateInterestedCompany,
  type InterestedCompany,
  type UpdateInterestedCompanyInput,
} from "@/entities/interested-company";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { CreateApplicationDialog } from "@/features/create-application";
import { CreateInterestedCompanyDialog } from "@/features/create-interested-company";
import { todayKST } from "@/shared/lib/kst-date";
import { ApplicationDetailDialog } from "@/widgets/kanban-board";

import { computeBestProject } from "../model/compute-best-project";
import { countDueThisWeek, groupByDeadline } from "../model/group-by-deadline";
import { InterestedCompanyRow } from "./interested-company-row";

export function Watchlist({
  companies,
  allProjectMatches,
}: {
  companies: InterestedCompany[];
  allProjectMatches: ProjectMatchWithCompany[];
}) {
  const [items, setItems] = useState(companies);
  const [prevCompanies, setPrevCompanies] = useState(companies);
  if (companies !== prevCompanies) {
    setPrevCompanies(companies);
    setItems(companies);
  }
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailCompany = items.find((c) => c.id === detailId) ?? null;
  const [applyCompany, setApplyCompany] = useState<InterestedCompany | null>(null);

  function handleUpdate(id: string, input: UpdateInterestedCompanyInput) {
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
    updateInterestedCompany(id, input).catch(console.error);
  }

  function handleDelete(id: string) {
    const company = items.find((c) => c.id === id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    setDetailId(null);
    deleteInterestedCompany(id, { screenshotPaths: company?.screenshotPaths }).catch(console.error);
  }

  function handleConvert(id: string) {
    // 전환된 지원카드가 같은 스크린샷 경로를 그대로 쓰므로 Storage 파일은 지우지 않는다.
    setItems((prev) => prev.filter((c) => c.id !== id));
    deleteInterestedCompany(id).catch(console.error);
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
            onApply={setApplyCompany}
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
                onApply={setApplyCompany}
              />
            ))}
          </div>
        </div>
      )}

      <ApplicationDetailDialog
        key={`detail-${detailCompany?.id ?? "none"}`}
        variant="interested"
        company={detailCompany}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onApply={setApplyCompany}
      />
      <CreateApplicationDialog
        key={`apply-${applyCompany?.id ?? "none"}`}
        trigger={null}
        open={applyCompany !== null}
        onOpenChange={(open) => !open && setApplyCompany(null)}
        initialValues={
          applyCompany
            ? {
                company: applyCompany.company,
                position: applyCompany.position ?? "",
                deadline: applyCompany.deadline,
                jobPostingUrl: applyCompany.jobPostingUrl,
                techStack: applyCompany.techStack,
                description: applyCompany.description,
                memo: applyCompany.memo,
                screenshotPaths: applyCompany.screenshotPaths,
              }
            : undefined
        }
        onCreated={() => {
          if (applyCompany) handleConvert(applyCompany.id);
          setApplyCompany(null);
        }}
      />
    </div>
  );
}
