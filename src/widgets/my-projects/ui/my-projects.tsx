"use client";

import { useState } from "react";

import type { Application } from "@/entities/application";
import {
  deleteMyProject,
  updateMyProject,
  type MyProject,
  type UpdateMyProjectInput,
} from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { CreateMyProjectDialog, InlineProjectImport } from "@/features/create-my-project";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { PageLayout } from "@/shared/ui/page-layout";
import { PlaceholderBar, PlaceholderBox } from "@/shared/ui/placeholder";

import { computeBestMatch } from "../model/compute-best-match";
import { computeSkillGap } from "../model/compute-skill-gap";
import { computeTopTechStack } from "../model/compute-top-tech-stack";
import { MyProjectDetailDialog } from "./my-project-detail-dialog";
import { ProjectRow } from "./project-row";
import { SkillGapBox } from "./skill-gap-box";

export function MyProjects({
  projects,
  applications,
  allProjectMatches,
  comparableCount,
  onNavigateToCompany,
}: {
  projects: MyProject[];
  applications: Application[];
  allProjectMatches: ProjectMatchWithCompany[];
  // 관심/진행 중인 공고 수 — 빈 상태에서 "관심 공고 N개와 비교할 수 있어요" 안내에 쓴다.
  comparableCount: number;
  onNavigateToCompany?: (company: string) => void;
}) {
  const [items, setItems] = useState(projects);
  const [prevProjects, setPrevProjects] = useState(projects);
  if (projects !== prevProjects) {
    setPrevProjects(projects);
    setItems(projects);
  }
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const detailProject = items.find((p) => p.id === detailId) ?? null;

  const isEmpty = items.length === 0;
  const topTechStack = computeTopTechStack(items);
  const skillGap = computeSkillGap(applications, items);

  function openDetail(id: string, mode: "view" | "edit") {
    if (mode === "edit" && blockInSampleMode()) return;
    setDetailMode(mode);
    setDetailId(id);
  }

  function handleUpdate(id: string, input: UpdateMyProjectInput) {
    if (blockInSampleMode()) return;
    setItems((prev) =>
      prev.map((project) =>
        project.id === id
          ? {
              ...project,
              ...input,
              techStack: input.techStack ?? project.techStack,
              highlights: input.highlights ?? project.highlights,
            }
          : project
      )
    );
    updateMyProject(id, input).catch(console.error);
  }

  function handleDelete(id: string) {
    if (blockInSampleMode()) return;
    setItems((prev) => prev.filter((project) => project.id !== id));
    setDetailId(null);
    deleteMyProject(id).catch(console.error);
  }

  return (
    <PageLayout
      title={isEmpty ? "등록된 프로젝트가 없어요" : `프로젝트 ${items.length}개로 공고와 매칭하고 있어요`}
      subtitle={
        !isEmpty
          ? `가장 많이 쓴 기술 · ${topTechStack.join(", ") || "—"}`
          : comparableCount > 0
            ? `관심 공고 ${comparableCount}개와 비교할 수 있어요`
            : "등록한 프로젝트로 공고 매칭과 예상 질문을 만들어요"
      }
      action={
        <CreateMyProjectDialog
          trigger={
            <button
              type="button"
              className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              프로젝트 추가
            </button>
          }
        />
      }
    >
      {!isEmpty && skillGap.length > 0 && (
        <div className="mb-4">
          <SkillGapBox items={skillGap} />
        </div>
      )}

      {isEmpty && (
        <>
          <p className="mb-4 text-xs text-muted-foreground">가장 많이 쓴 기술 · —</p>
          <EmptyProjectList />
        </>
      )}

      <div className="flex flex-col">
        {items.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            bestMatch={computeBestMatch(project.name, allProjectMatches)}
            onOpenDetail={(id) => openDetail(id, "view")}
            onEdit={(id) => openDetail(id, "edit")}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <MyProjectDetailDialog
        key={`detail-${detailProject?.id ?? "none"}`}
        project={detailProject}
        allProjectMatches={allProjectMatches}
        initialMode={detailMode}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onNavigateToCompany={onNavigateToCompany}
      />
    </PageLayout>
  );
}

// 실제 행(ProjectRow)과 같은 구조로 두 줄을 깐다 — 첫 줄은 그 자리에서 바로 등록하는
// 입력 행, 둘째 줄은 흐린 예시 행.
function EmptyProjectList() {
  return (
    <div className="flex flex-col [&>*:last-child]:border-b">
      <InlineProjectImport />
      <div aria-hidden className="grid min-h-[104px] grid-cols-[28px_1fr] items-start gap-3 border-t px-2 py-4 opacity-40">
        <PlaceholderBox className="size-7" />
        <div className="flex flex-col gap-2 pt-1">
          <PlaceholderBar className="w-24" />
          <PlaceholderBar className="w-56" />
          <PlaceholderBar className="w-40" />
        </div>
      </div>
    </div>
  );
}
