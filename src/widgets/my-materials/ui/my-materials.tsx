"use client";

import { useState } from "react";

import type { Application } from "@/entities/application";
import {
  deleteMyProject,
  updateMyProject,
  type MyProject,
  type UpdateMyProjectInput,
} from "@/entities/my-project";
import type { UserDocument } from "@/entities/document";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { CreateMyProjectDialog, InlineProjectImport } from "@/features/create-my-project";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { HelpButton } from "@/shared/ui/help-button";
import { PageLayout } from "@/shared/ui/page-layout";
import { PlaceholderBar, PlaceholderBox } from "@/shared/ui/placeholder";

import { computeBestMatch } from "../model/compute-best-match";
import { computeSkillGap } from "../model/compute-skill-gap";
import { computeTopTechStack } from "../model/compute-top-tech-stack";
import { MyProjectDetailDialog } from "./my-project-detail-dialog";
import { ProjectRow } from "./project-row";
import { CoverLetterSection, ResumeSection, SECTION_ACTION, SectionHeader } from "./document-sections";
import { SkillGapBox } from "./skill-gap-box";

// "내 자료" 탭 — 이력서(1개)·자소서(여러 개, 대표 1개)·프로젝트. 공고 상세의 "공고 매칭"과
// 예상 질문이 여기 등록한 자료를 기준으로 만들어진다.
export function MyMaterials({
  projects,
  documents,
  applications,
  allProjectMatches,
  onNavigateToCompany,
}: {
  projects: MyProject[];
  documents: UserDocument[];
  applications: Application[];
  allProjectMatches: ProjectMatchWithCompany[];
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
  const resume = documents.find((d) => d.kind === "resume") ?? null;
  const coverLetters = documents.filter((d) => d.kind === "cover_letter");
  const materialCount = items.length + documents.length;
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
      title={
        <span className="inline-flex items-center gap-1.5">
          {materialCount === 0 ? "등록된 자료가 없어요" : "내 자료"}
          <HelpButton chapterId="projects" label="내 자료" />
        </span>
      }
      subtitle="공고 매칭과 예상 질문에 쓰는 자료예요"
    >
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <SectionHeader
            title={`프로젝트${isEmpty ? "" : ` ${items.length}`}`}
            action={
              <CreateMyProjectDialog
                trigger={
                  <button type="button" className={SECTION_ACTION}>
                    프로젝트 추가
                  </button>
                }
              />
            }
          />
          <p className="text-xs text-muted-foreground">
            가장 많이 쓴 기술 · {topTechStack.join(", ") || "—"}
          </p>
          {!isEmpty && skillGap.length > 0 && <SkillGapBox items={skillGap} />}
          {isEmpty && <EmptyProjectList />}

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
        </section>

        {/* 신입은 이력서·자소서가 없을 수 있어서 선택 자료로 프로젝트 아래에 둔다. */}
        <CoverLetterSection coverLetters={coverLetters} />
        <ResumeSection resume={resume} />
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
