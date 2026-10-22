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
import { CreateMyProjectDialog } from "@/features/create-my-project";

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
  onNavigateToCompany,
}: {
  projects: MyProject[];
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

  const topTechStack = computeTopTechStack(items);
  const skillGap = computeSkillGap(applications, items);

  function openDetail(id: string, mode: "view" | "edit") {
    setDetailMode(mode);
    setDetailId(id);
  }

  function handleUpdate(id: string, input: UpdateMyProjectInput) {
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
    setItems((prev) => prev.filter((project) => project.id !== id));
    setDetailId(null);
    deleteMyProject(id).catch(console.error);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-6 pt-10">
        <p className="text-[22px] font-medium tracking-tight">아직 등록된 프로젝트가 없어요</p>
        <CreateMyProjectDialog />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-6 pt-10 pb-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[22px] font-medium tracking-tight">
          프로젝트 {items.length}개로 공고와 매칭하고 있어요
        </p>
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
      </div>

      {topTechStack.length > 0 && (
        <p className="text-xs text-muted-foreground">
          가장 많이 쓴 기술 · {topTechStack.join(", ")}
        </p>
      )}

      <SkillGapBox items={skillGap} />

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
    </div>
  );
}
