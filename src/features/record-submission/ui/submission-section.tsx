"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

import { updateSubmission, type Application } from "@/entities/application";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { Button } from "@/shared/ui/button";

const SECTION_LABEL = "text-[11px] text-muted-foreground";
const COVER_LETTER_PREVIEW_CHARS = 160;

// 지원할 때 낸 자소서와 어필한 프로젝트를 남겨두는 곳. 면접 질문은 대부분 제출
// 서류에서 나와서, 이 기록이 프로젝트 기반 예상 질문 생성에 그대로 들어간다.
export function SubmissionSection({
  application,
  myProjects,
}: {
  application: Application;
  myProjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState({
    submittedProjectIds: application.submittedProjectIds,
    coverLetter: application.coverLetter,
  });
  const [editing, setEditing] = useState(false);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>(saved.submittedProjectIds);
  const [draftCoverLetter, setDraftCoverLetter] = useState(saved.coverLetter ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // 삭제된 프로젝트 id는 조용히 빼고 보여준다.
  const nameById = new Map(myProjects.map((p) => [p.id, p.name]));
  const savedProjectNames = saved.submittedProjectIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name));
  const hasRecord = savedProjectNames.length > 0 || Boolean(saved.coverLetter);
  const isLongCoverLetter = (saved.coverLetter?.length ?? 0) > COVER_LETTER_PREVIEW_CHARS;

  function startEdit() {
    if (blockInSampleMode()) return;
    setDraftProjectIds(saved.submittedProjectIds.filter((id) => nameById.has(id)));
    setDraftCoverLetter(saved.coverLetter ?? "");
    setError(null);
    setEditing(true);
  }

  function toggleProject(id: string) {
    setDraftProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSave() {
    const input = {
      submittedProjectIds: draftProjectIds,
      coverLetter: draftCoverLetter.trim() || null,
    };
    setPending(true);
    setError(null);
    try {
      await updateSubmission(application.id, input);
      setSaved(input);
      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error("제출 기록 저장 실패:", err);
      setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2.5">
        <p className={SECTION_LABEL}>제출 기록</p>
        <div className="flex flex-col gap-1.5">
          <p className={SECTION_LABEL}>어필한 프로젝트</p>
          {myProjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {myProjects.map((project) => {
                const selected = draftProjectIds.includes(project.id);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      selected ? "bg-foreground text-background" : "border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">등록된 프로젝트가 없어요</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={SECTION_LABEL}>제출한 자소서</p>
          <textarea
            value={draftCoverLetter}
            onChange={(e) => setDraftCoverLetter(e.target.value)}
            placeholder="지원할 때 낸 자소서 내용을 붙여넣어 주세요"
            rows={6}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    );
  }

  if (!hasRecord) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className={SECTION_LABEL}>제출 기록</p>
          <button type="button" onClick={startEdit} className="text-[11px] text-muted-foreground hover:text-foreground">
            기록하기
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          낸 자소서와 어필한 프로젝트를 남겨두면 프로젝트 기반 예상 질문에 반영돼요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className={SECTION_LABEL}>제출 기록</p>
        <button type="button" onClick={startEdit} className="text-[11px] text-muted-foreground hover:text-foreground">
          수정
        </button>
      </div>
      {savedProjectNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {savedProjectNames.map((name) => (
            <span key={name} className="rounded bg-[var(--heat-1)] px-1.5 py-0.5 text-xs text-highlight-foreground">
              {name}
            </span>
          ))}
        </div>
      )}
      {saved.coverLetter && (
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground",
              !expanded && isLongCoverLetter && "line-clamp-3"
            )}
          >
            {saved.coverLetter}
          </p>
          {isLongCoverLetter && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-start text-[11px] text-muted-foreground hover:text-foreground"
            >
              {expanded ? "접기" : "전체 보기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
