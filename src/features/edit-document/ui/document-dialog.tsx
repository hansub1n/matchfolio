"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  createDocument,
  deleteDocument,
  updateDocument,
  type DocumentKind,
  type UserDocument,
} from "@/entities/document";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { Button } from "@/shared/ui/button";
import { ConfirmDeleteDialog, ModalEditActions } from "@/shared/ui/confirm-delete-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const KIND_LABEL: Record<DocumentKind, string> = { resume: "이력서", cover_letter: "자소서" };
const DEFAULT_TITLE: Record<DocumentKind, string> = { resume: "이력서", cover_letter: "" };
const CONTENT_PLACEHOLDER: Record<DocumentKind, string> = {
  resume: "경력·학력·기술·활동 등 이력서 내용을 붙여넣어 주세요",
  cover_letter: "자소서 내용을 붙여넣어 주세요",
};
export const DELETE_SUBJECT: Record<DocumentKind, string> = { resume: "이력서", cover_letter: "자소서" };
export const DELETE_NOTE: Record<DocumentKind, string | undefined> = {
  resume: undefined,
  cover_letter: "제출 자료로 고른 공고에서도 선택이 풀려요.",
};

// 이력서·자소서 보기/등록/수정.
// - 있는 문서: 다른 상세 모달(공고·프로젝트)과 같은 틀 — 헤더(제목 + "수정") 고정, 본문 스크롤, 수정 화면 하단
//   왼쪽에 "삭제", 오른쪽에 취소·저장.
// - 새 문서: 다른 추가 모달처럼 제목 + 폼.
// trigger로 열거나(새 등록), 부모가 open을 쥐고 연다(행 클릭·"…" 메뉴). 부모가 열 때는 key를 바꿔 새로 마운트한다.
export function DocumentDialog({
  kind,
  document,
  trigger,
  initialMode = "edit",
  open: controlledOpen,
  onOpenChange,
}: {
  kind: DocumentKind;
  document?: UserDocument;
  trigger?: ReactNode;
  initialMode?: "view" | "edit";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [title, setTitle] = useState(document?.title ?? DEFAULT_TITLE[kind]);
  const [content, setContent] = useState(document?.content ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

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

  function handleDelete() {
    if (!document) return;
    setOpen(false);
    deleteDocument(document.id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  const fields = (
    <>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "cover_letter" ? "제목 (예: 프론트엔드 공통, 커머스 지원용)" : "제목"}
        className={inputClassName}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={CONTENT_PLACEHOLDER[kind]}
        rows={12}
        className={inputClassName}
      />
      {/* 생겼다 사라지는 줄이라 자리를 미리 둔다. */}
      <p className="min-h-4 text-xs text-destructive">{error}</p>
    </>
  );
  const canSave = !pending && title.trim() !== "" && content.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {document ? (
        <DialogContent className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* 다른 상세 모달과 같은 헤더 — 한 줄 제목 + 수정, 닫기 버튼 자리(pr-12)는 비워둔다. */}
          <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
            <DialogTitle className="min-w-0 flex-1 truncate text-base font-medium">{document.title}</DialogTitle>
            {mode === "view" && (
              <Button variant="ghost" size="xs" className="text-xs" onClick={handleStartEdit}>
                수정
              </Button>
            )}
          </div>
          {mode === "view" ? (
            <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
              <p className="text-[11.5px] text-muted-foreground">
                {KIND_LABEL[kind]}
                {document.isPrimary && " · 대표"} · {document.content.length.toLocaleString()}자 ·{" "}
                {formatDateTime(document.updatedAt.slice(0, 10))} 수정
              </p>
              {/* 긴 글이라 양끝 맞춤으로 오른쪽 끝을 가지런히. */}
              <p className="text-justify text-sm leading-7 whitespace-pre-wrap">{document.content}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
              {fields}
              <ModalEditActions
                onDelete={() => setConfirmOpen(true)}
                onCancel={handleCancel}
                saving={pending}
                canSave={title.trim() !== "" && content.trim() !== ""}
              />
            </form>
          )}
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KIND_LABEL[kind]} 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {fields}
            <DialogFooter className="py-3">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                취소
              </Button>
              <Button type="submit" className="min-w-16" disabled={!canSave}>
                {pending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subject={DELETE_SUBJECT[kind]}
        description={DELETE_NOTE[kind]}
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
