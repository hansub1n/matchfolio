"use client";

import { useState } from "react";

import {
  deleteMyProject,
  updateMyProject,
  type MyProject,
  type UpdateMyProjectInput,
} from "@/entities/my-project";

import { MyProjectCard } from "./my-project-card";
import { MyProjectDetailDialog } from "./my-project-detail-dialog";

export function MyProjects({ projects }: { projects: MyProject[] }) {
  const [items, setItems] = useState(projects);
  const [prevProjects, setPrevProjects] = useState(projects);
  if (projects !== prevProjects) {
    setPrevProjects(projects);
    setItems(projects);
  }
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailProject = items.find((p) => p.id === detailId) ?? null;

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

  return (
    <div className="flex flex-wrap gap-2 px-4">
      {items.map((project) => (
        <MyProjectCard
          key={project.id}
          project={project}
          onOpenDetail={setDetailId}
          onDelete={handleDelete}
        />
      ))}
      <MyProjectDetailDialog
        project={detailProject}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
