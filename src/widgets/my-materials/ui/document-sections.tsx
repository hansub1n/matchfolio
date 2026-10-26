"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { cn } from "cn";

import { deleteDocument, setPrimaryCoverLetter, type UserDocument } from "@/entities/document";
import { DELETE_NOTE, DELETE_SUBJECT, DocumentDialog } from "@/features/edit-document";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { ConfirmDeleteDialog } from "@/shared/ui/confirm-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { EmptyHint } from "@/shared/ui/placeholder";

export const SECTION_ACTION = "rounded-full border bg-card px-3 py-1.5 text-xs max-sm:px-3.5 max-sm:py-2 max-sm:text-[13px] hover:bg-accent";

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function SectionHeader({
  title,
  optional = false,
  action,
}: {
  title: string;
  optional?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="text-sm font-medium">
        {title}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted-foreground">선택</span>}
      </h2>
      {action}
    </div>
  );
}

function DocumentRow({
  document,
  leading,
}: {
  document: UserDocument;
  leading?: ReactNode;
}) {
  const router = useRouter();
  // 행 클릭 → 보기, "…" 메뉴의 수정 → 바로 수정. 열 때마다 key를 바꿔 새로 마운트한다.
  const [dialog, setDialog] = useState<{ mode: "view" | "edit"; key: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function open(mode: "view" | "edit") {
    if (mode === "edit" && blockInSampleMode()) return;
    setDialog({ mode, key: Date.now() });
  }

  function handleDelete() {
    if (blockInSampleMode()) return;
    deleteDocument(document.id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  // 프로젝트 행과 같은 틀 — 행 전체를 누르면 상세, 오른쪽 위 "…"(hover 시 노출)에 수정·삭제.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open("view")}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          open("view");
        }
      }}
      className="group relative grid cursor-pointer grid-cols-[20px_1fr] items-start gap-3 rounded-lg border-t px-2 py-3.5 pr-9 last:border-b hover:bg-accent"
    >
      <span className="flex h-5 items-center justify-center" onClick={stopClick}>
        {leading}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px] font-medium">{document.title}</p>
        <p className="line-clamp-2 text-[13px] whitespace-pre-line text-muted-foreground">{document.content}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={stopClick}
            className="absolute top-3 right-2 rounded-sm p-1 max-sm:p-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted hover:text-foreground [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
            <span className="sr-only">더보기</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stopClick}>
          <DropdownMenuItem onSelect={() => open("edit")}>
            <Pencil className="size-3.5" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 다이얼로그 안의 클릭이 React 트리를 따라 행까지 올라오지 않게 감싼다. */}
      <div className="contents" onClick={stopClick}>
        {dialog && (
          <DocumentDialog
            key={dialog.key}
            kind={document.kind}
            document={document}
            initialMode={dialog.mode}
            open
            onOpenChange={(next) => {
              if (!next) setDialog(null);
            }}
          />
        )}
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          subject={DELETE_SUBJECT[document.kind]}
          description={DELETE_NOTE[document.kind]}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}

// 선택 자료라 비어 있어도 "채워야 할 칸"처럼 보이지 않게 예시 행 없이 한 줄 안내만 둔다.
function EmptyDocumentRow({ hint }: { hint: string }) {
  return (
    <div className="border-t pt-3">
      <EmptyHint>{hint}</EmptyHint>
    </div>
  );
}

export function ResumeSection({ resume }: { resume: UserDocument | null }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="이력서"
        optional
        action={
          !resume && (
            <DocumentDialog
              kind="resume"
              trigger={
                <button type="button" className={SECTION_ACTION}>
                  이력서 등록
                </button>
              }
            />
          )
        }
      />
      {resume ? (
        <div className="flex flex-col">
          <DocumentRow document={resume} />
        </div>
      ) : (
        <EmptyDocumentRow hint="경력·활동이 있다면 넣어두세요. 공고마다 이력서에서 강조할 점을 알려드려요" />
      )}
    </section>
  );
}

export function CoverLetterSection({ coverLetters }: { coverLetters: UserDocument[] }) {
  const router = useRouter();

  function handleSetPrimary(id: string) {
    if (blockInSampleMode()) return;
    setPrimaryCoverLetter(id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={`자소서${coverLetters.length > 0 ? ` ${coverLetters.length}` : ""}`}
        optional
        action={
          <DocumentDialog
            kind="cover_letter"
            trigger={
              <button type="button" className={SECTION_ACTION}>
                자소서 추가
              </button>
            }
          />
        }
      />
      {coverLetters.length > 0 ? (
        <>
          <p className="text-[11.5px] text-muted-foreground">
            대표 자소서(★)를 기준으로 공고 매칭이 첨삭해요. 공고마다 실제로 낸 자소서는 상세 화면의 제출 자료에서 고를 수 있어요
          </p>
          <div className="flex flex-col">
            {coverLetters.map((letter) => (
              <DocumentRow
                key={letter.id}
                document={letter}
                leading={
                  <button
                    type="button"
                    onClick={() => !letter.isPrimary && handleSetPrimary(letter.id)}
                    aria-label={letter.isPrimary ? "대표 자소서" : "대표 자소서로 지정"}
                    title={letter.isPrimary ? "대표 자소서" : "대표 자소서로 지정"}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Star className={cn("size-4", letter.isPrimary && "fill-highlight text-highlight")} />
                  </button>
                }
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyDocumentRow hint="넣으면 공고 매칭에서 자소서 첨삭을 받을 수 있어요. 여러 개 넣고 대표를 정할 수 있어요" />
      )}
    </section>
  );
}
