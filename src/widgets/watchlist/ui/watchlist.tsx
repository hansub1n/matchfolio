"use client";

import { useState } from "react";

import {
  deleteInterestedCompany,
  updateInterestedCompany,
  type InterestedCompany,
  type UpdateInterestedCompanyInput,
} from "@/entities/interested-company";
import { CreateApplicationDialog } from "@/features/create-application";
import { ApplicationDetailDialog } from "@/widgets/kanban-board";

import { InterestedCompanyCard } from "./interested-company-card";

export function Watchlist({ companies }: { companies: InterestedCompany[] }) {
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

  return (
    <div className="flex flex-wrap gap-2 px-6">
      {items.map((company) => (
        <InterestedCompanyCard
          key={company.id}
          company={company}
          onOpenDetail={setDetailId}
          onDelete={handleDelete}
          onConvert={handleConvert}
        />
      ))}
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
