"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "cn";

import { deleteDocument, setPrimaryCoverLetter, type UserDocument } from "@/entities/document";
import { DocumentDialog } from "@/features/edit-document";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { EmptyHint } from "@/shared/ui/placeholder";

export const SECTION_ACTION = "rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent";
const ROW_ACTION = "text-[11px] text-muted-foreground hover:text-foreground";

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
  extraActions,
}: {
  document: UserDocument;
  leading?: ReactNode;
  extraActions?: ReactNode;
}) {
  const router = useRouter();

  function handleDelete() {
    if (blockInSampleMode()) return;
    if (!window.confirm(`"${document.title}"을(를) 삭제할까요?`)) return;
    deleteDocument(document.id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  return (
    <div className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-t px-2 py-3.5 last:border-b">
      <span className="flex h-5 items-center justify-center">{leading}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px] font-medium">{document.title}</p>
        <p className="line-clamp-2 text-[13px] whitespace-pre-line text-muted-foreground">{document.content}</p>
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        {extraActions}
        <DocumentDialog
          kind={document.kind}
          document={document}
          trigger={
            <button type="button" className={ROW_ACTION}>
              수정
            </button>
          }
        />
        <button type="button" onClick={handleDelete} className={ROW_ACTION}>
          삭제
        </button>
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
            대표 자소서(★)를 기준으로 공고 매칭이 첨삭해요. 공고마다 실제로 낸 자소서는 제출 기록에서 고를 수 있어요
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
                    <Star className={cn("size-4", letter.isPrimary && "fill-highlight text-highlight-foreground")} />
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
