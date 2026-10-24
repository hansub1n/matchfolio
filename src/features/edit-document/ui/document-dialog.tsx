"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createDocument, updateDocument, type DocumentKind, type UserDocument } from "@/entities/document";
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

// 이력서·자소서 등록/수정. 본문은 붙여넣기 — 공고 매칭이 이 원문을 기준으로 첨삭한다.
export function DocumentDialog({
  kind,
  document,
  trigger,
}: {
  kind: DocumentKind;
  // 있으면 수정, 없으면 새로 등록.
  document?: UserDocument;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(document?.title ?? DEFAULT_TITLE[kind]);
  const [content, setContent] = useState(document?.content ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next && blockInSampleMode()) return;
    setOpen(next);
    if (next) {
      setTitle(document?.title ?? DEFAULT_TITLE[kind]);
      setContent(document?.content ?? "");
      setError(null);
    }
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" className="min-w-16" disabled={pending || !title.trim() || !content.trim()}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
