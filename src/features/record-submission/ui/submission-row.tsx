"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

import { updateSubmission, type Application } from "@/entities/application";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

const SECTION_LABEL = "text-[11px] text-muted-foreground";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// 상세 모달 기본 정보(지원일·마감일·링크)와 같은 "라벨 | 값" 줄. 지원할 때 낸 자소서와 어필한
// 프로젝트를 "내 자료"에서 고른다(본문은 여기서 쓰지 않음). 면접 질문은 대부분 제출 서류에서
// 나와서, 이 기록이 프로젝트 기반 예상 질문 생성에 그대로 들어간다. 부모가 2열 그리드라 라벨과
// 값 두 칸을 그대로 돌려준다.
export function SubmissionRow({
  application,
  myProjects,
  coverLetters,
}: {
  application: Application;
  myProjects: { id: string; name: string }[];
  coverLetters: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState({
    submittedProjectIds: application.submittedProjectIds,
    submittedCoverLetterId: application.submittedCoverLetterId,
  });
  const [open, setOpen] = useState(false);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>(saved.submittedProjectIds);
  const [draftCoverLetterId, setDraftCoverLetterId] = useState<string | null>(saved.submittedCoverLetterId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 삭제된 자료 id는 조용히 빼고 보여준다.
  const projectNameById = new Map(myProjects.map((p) => [p.id, p.name]));
  const coverLetterTitle = coverLetters.find((c) => c.id === saved.submittedCoverLetterId)?.title ?? null;
  const savedProjectNames = saved.submittedProjectIds
    .map((id) => projectNameById.get(id))
    .filter((name): name is string => Boolean(name));
  const summary = [coverLetterTitle, savedProjectNames.join(" · ")].filter(Boolean).join(", ");
  const hasMaterials = myProjects.length > 0 || coverLetters.length > 0;

  function handleOpenChange(next: boolean) {
    if (next) {
      if (blockInSampleMode()) return;
      setDraftProjectIds(saved.submittedProjectIds.filter((id) => projectNameById.has(id)));
      setDraftCoverLetterId(coverLetterTitle ? saved.submittedCoverLetterId : null);
      setError(null);
    }
    setOpen(next);
  }

  function toggleProject(id: string) {
    setDraftProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSave() {
    const input = { submittedProjectIds: draftProjectIds, submittedCoverLetterId: draftCoverLetterId };
    setPending(true);
    setError(null);
    try {
      await updateSubmission(application.id, input);
      setSaved(input);
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("제출 자료 저장 실패:", err);
      setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <span className="text-muted-foreground">제출 자료</span>
      {!hasMaterials ? (
        <span className="text-muted-foreground">내 자료에 자소서나 프로젝트를 등록하면 고를 수 있어요</span>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn("truncate text-left hover:underline", !summary && "text-muted-foreground")}
            >
              {summary || "고르기"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-80 flex-col gap-3">
            <p className="text-[11.5px] text-muted-foreground">
              고른 자소서와 프로젝트를 기준으로 프로젝트 기반 예상 질문을 만들어요
            </p>
            <div className="flex flex-col gap-1.5">
              <p className={SECTION_LABEL}>낸 자소서</p>
              {coverLetters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {coverLetters.map((letter) => (
                    <Chip
                      key={letter.id}
                      selected={draftCoverLetterId === letter.id}
                      onClick={() => setDraftCoverLetterId((prev) => (prev === letter.id ? null : letter.id))}
                    >
                      {letter.title}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">내 자료에 등록된 자소서가 없어요</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className={SECTION_LABEL}>어필한 프로젝트</p>
              {myProjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {myProjects.map((project) => (
                    <Chip
                      key={project.id}
                      selected={draftProjectIds.includes(project.id)}
                      onClick={() => toggleProject(project.id)}
                    >
                      {project.name}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">내 자료에 등록된 프로젝트가 없어요</p>
              )}
            </div>
            <p className="min-h-4 text-xs text-destructive">{error}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                취소
              </Button>
              <Button size="sm" className="min-w-16" onClick={handleSave} disabled={pending}>
                {pending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
