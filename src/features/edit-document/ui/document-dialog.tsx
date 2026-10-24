"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createDocument, updateDocument, type DocumentKind, type UserDocument } from "@/entities/document";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const KIND_LABEL: Record<DocumentKind, string> = { resume: "이력서", cover_letter: "자소서" };
const DEFAULT_TITLE: Record<DocumentKind, string> = { resume: "이력서", cover_letter: "" };
const CONTENT_PLACEHOLDER: Record<DocumentKind, string> = {
  resume: "경력·학력·기술·활동 등 이력서 내용을 붙여넣어 주세요",
  cover_letter: "자소서 내용을 붙여넣어 주세요",
};

// 이력서·자소서 보기/등록/수정. 본문은 붙여넣기 — 공고 매칭이 이 원문을 기준으로 첨삭한다.
// initialMode="view"로 열면 전체 본문을 읽는 화면부터 보여주고, 헤더의 "수정"으로 폼에 들어간다.
export function DocumentDialog({
  kind,
  document,
  trigger,
  initialMode = "edit",
}: {
  kind: DocumentKind;
  // 있으면 보기·수정, 없으면 새로 등록.
  document?: UserDocument;
  trigger: ReactNode;
  initialMode?: "view" | "edit";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [title, setTitle] = useState(document?.title ?? DEFAULT_TITLE[kind]);
  const [content, setContent] = useState(document?.content ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewing = mode === "view" && document !== undefined;

  function resetForm() {
    setTitle(document?.title ?? DEFAULT_TITLE[kind]);
    setContent(document?.content ?? "");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    // 보기는 샘플 모드에서도 열 수 있다 — 막는 건 저장으로 이어지는 폼뿐.
    if (next && !(initialMode === "view" && document) && blockInSampleMode()) return;
    setOpen(next);
    if (next) {
      setMode(initialMode);
      resetForm();
    }
  }

  function handleStartEdit() {
    if (blockInSampleMode()) return;
    resetForm();
    setMode("edit");
  }

  function handleCancel() {
    // 보기에서 들어온 수정이면 보기로 돌아가고, 바로 수정으로 열었으면 닫는다.
    if (initialMode === "view" && document) setMode("view");
    else setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setPending(true);
    setError(null);
    try {
      const input = { title: title.trim(), content: content.trim() };
      if (document) await updateDocument(document.id, input);
      else await createDocument({ kind, ...input });
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(`${KIND_LABEL[kind]} 저장 실패:`, err);
      setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {viewing ? (
        <DialogContent className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* 다른 상세 모달과 같은 헤더 — 한 줄 제목 + 수정, 닫기 버튼 자리(pr-12)는 비워둔다. */}
          <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
            <DialogTitle className="min-w-0 flex-1 truncate text-base font-medium">{document.title}</DialogTitle>
            <Button variant="ghost" size="xs" className="text-xs" onClick={handleStartEdit}>
              수정
            </Button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <p className="text-[11.5px] text-muted-foreground">
              {KIND_LABEL[kind]}
              {document.isPrimary && " · 대표"} · {document.content.length.toLocaleString()}자 ·{" "}
              {formatDateTime(document.updatedAt.slice(0, 10))} 수정
            </p>
            {/* 긴 글이라 양끝 맞춤으로 오른쪽 끝을 가지런히. */}
            <p className="text-justify text-sm leading-7 whitespace-pre-wrap">{document.content}</p>
          </div>
        </DialogContent>
      ) : (
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {KIND_LABEL[kind]} {document ? "수정" : "등록"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "cover_letter" ? "예: 프론트엔드 공통, 커머스 지원용" : undefined}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={CONTENT_PLACEHOLDER[kind]}
              rows={12}
              className={inputClassName}
            />
          </div>
          <p className="min-h-4 text-xs text-destructive">{error}</p>
          <DialogFooter className="py-3">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              취소
            </Button>
            <Button type="submit" className="min-w-16" disabled={pending || !title.trim() || !content.trim()}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      )}
    </Dialog>
  );
}
