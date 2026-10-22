"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { MyProject } from "@/entities/my-project";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import type { BestMatch } from "../model/compute-best-match";

// "런픽 (Run-Pick)"처럼 뒤에 괄호 부제가 붙어 있으면 분리해서 다르게 보여준다.
function splitNameSubtitle(name: string): { main: string; subtitle: string | null } {
  const match = name.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return { main: name, subtitle: null };
  return { main: match[1], subtitle: match[2] };
}

function formatTechSummary(techStack: string[]): string {
  const shown = techStack.slice(0, 5);
  const rest = techStack.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` +${rest}` : "");
}

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function ProjectRow({
  project,
  bestMatch,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  project: MyProject;
  bestMatch: BestMatch | null;
  onOpenDetail?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { main, subtitle } = splitNameSubtitle(project.name);

  function handleRowClick() {
    onOpenDetail?.(project.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      onOpenDetail?.(project.id);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      className="group relative grid cursor-pointer grid-cols-[28px_1fr_auto] items-start gap-3 rounded-lg border-t border-border px-2 py-4 last:border-b hover:bg-accent"
    >
      <CompanyMonogram company={project.name} size={28} />

      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px] font-medium">
          {main}
          {subtitle && <span className="font-normal text-muted-foreground"> {subtitle}</span>}
        </p>
        {project.description && (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>
        )}
        {project.techStack.length > 0 && (
          <p className="text-xs text-muted-foreground">{formatTechSummary(project.techStack)}</p>
        )}
        {project.highlights.length > 0 && (
          <p className="text-xs">
            {project.highlights[0]}
            {project.highlights.length > 1 && (
              <span className="text-muted-foreground"> 외 {project.highlights.length - 1}개</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <p className="text-[11.5px] text-muted-foreground">잘 맞는 공고</p>
        {bestMatch ? (
          <p className="text-sm">
            <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
              {bestMatch.company}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">매칭 기록 없음</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={stopClick}
            className="absolute top-3 right-2 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted hover:text-foreground [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
            <span className="sr-only">더보기</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stopClick}>
          <DropdownMenuItem onSelect={() => onEdit?.(project.id)}>
            <Pencil className="size-3.5" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={stopClick}>
          <DialogHeader>
            <DialogTitle>{project.name} 프로젝트를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(project.id);
                setConfirmOpen(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
