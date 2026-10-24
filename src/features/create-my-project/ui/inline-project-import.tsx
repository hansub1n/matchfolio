"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createMyProject } from "@/entities/my-project";
import { extractProject } from "@/features/extract-project";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import { PlaceholderBar, PlaceholderBox } from "@/shared/ui/placeholder";

import { CreateMyProjectDialog, type MyProjectDraft } from "./create-my-project-dialog";

// 행 상태(입력 → 불러오는 중 → 결과)가 바뀌어도 목록이 위아래로 흔들리지 않게 높이를 맞춘다.
const ROW = "grid min-h-[104px] grid-cols-[28px_1fr] items-start gap-3 border-t px-2 py-4";

function formatTechSummary(techStack: string[]): string {
  const shown = techStack.slice(0, 3);
  const rest = techStack.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` +${rest}` : "");
}

// 프로젝트 0개일 때 첫 행 자리에서 바로 등록한다 — 모달을 열지 않고 GitHub 주소를 붙여넣고
// "불러오기"를 누르면, 그 행이 스켈레톤을 거쳐 실제 프로젝트 행 모양으로 바뀐다.
export function InlineProjectImport() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<MyProjectDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await extractProject({ githubUrl: githubUrl.trim() }));
    } catch (err) {
      console.warn("프로젝트 불러오기 실패:", err);
      setError(err instanceof Error ? err.message : "불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await createMyProject(draft);
      router.refresh();
    } catch (err) {
      console.error("프로젝트 저장 실패:", err);
      setError("저장하지 못했어요. 잠시 후 다시 시도해주세요");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={ROW} aria-busy>
        <PlaceholderBox className="size-7 animate-pulse" />
        <div className="flex animate-pulse flex-col gap-2 pt-1">
          <PlaceholderBar className="w-32" />
          <PlaceholderBar className="w-72" />
          <PlaceholderBar className="w-40" />
        </div>
      </div>
    );
  }

  if (draft) {
    return (
      <div className={ROW}>
        <CompanyMonogram company={draft.name} size={28} />
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-[15px] font-medium">{draft.name}</p>
            {draft.description && (
              <p className="line-clamp-2 text-[13px] text-muted-foreground">{draft.description}</p>
            )}
            {draft.techStack.length > 0 && (
              <p className="text-xs text-muted-foreground">{formatTechSummary(draft.techStack)}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" className="min-w-14" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중" : "저장"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={saving}>
              수정
            </Button>
          </div>
        </div>
        <CreateMyProjectDialog
          key={draft.name}
          trigger={null}
          initialValues={draft}
          open={editOpen}
          onOpenChange={setEditOpen}
          onCreated={() => setDraft(null)}
        />
      </div>
    );
  }

  return (
    <div className={ROW}>
      <PlaceholderBox className="size-7 opacity-40" />
      <div className="flex flex-col gap-2">
        <form onSubmit={handleImport} className="flex gap-1.5">
          <input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="GitHub 저장소 주소 붙여넣기"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="sm" disabled={!githubUrl.trim()}>
            불러오기
          </Button>
        </form>
        <div className="flex min-h-4 items-center gap-2 text-[11px]">
          <CreateMyProjectDialog
            initialTab="manual"
            trigger={
              <button type="button" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                직접 입력
              </button>
            }
          />
          {error && <span className="text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  );
}
