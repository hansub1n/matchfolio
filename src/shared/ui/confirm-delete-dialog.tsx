"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

// 삭제 확인 — 카드·행의 "…" 메뉴와 상세 모달 수정 화면의 "삭제"가 모두 이 모양을 쓴다.
// 그 행·상세에서 바로 열리는 창이라 무엇을 지우는지는 이미 보이고 있어서 이름은 따로 넣지 않는다(긴 자소서
// 제목이 잘려 들어가면 오히려 어색했다). 질문 한 줄 + 회색 사실 한 줄 + 같은 모양 버튼 두 개를 반씩.
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  subject,
  description = "삭제하면 되돌릴 수 없어요.",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // 지우는 것의 종류 — "공고", "관심 공고", "프로젝트", "자소서", "이력서"(모두 받침 없이 끝나서 "를").
  subject: string;
  // 함께 지워지거나 바뀌는 것 한 줄.
  description?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 카드·행 안에서 열려도 클릭이 부모(행 열기·드래그)로 올라가지 않게 막는다. 기본 DialogContent는
          grid + overflow-y-auto라 스크롤바가 생길 수 있어서, 짧은 이 창은 flex + overflow-hidden으로 둔다. */}
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-5 overflow-hidden rounded-xl p-5 sm:max-w-[320px]"
        onClick={stopClick}
      >
        <div className="flex flex-col gap-1.5">
          <DialogTitle className="text-[15px] font-medium">이 {subject}를 삭제할까요?</DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground">{description}</DialogDescription>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 max-sm:h-10 rounded-lg bg-muted text-[13px] font-medium hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="h-9 max-sm:h-10 rounded-lg bg-destructive/10 text-[13px] font-medium text-destructive hover:bg-destructive/15"
          >
            삭제
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 상세 모달 수정 화면의 맨 아래 줄 — 왼쪽 "삭제"(글자 버튼, 저장·취소와 무게를 다르게), 오른쪽 취소·저장.
// 공고·프로젝트·자소서·이력서 상세가 모두 이 줄을 쓴다.
export function ModalEditActions({
  onDelete,
  onCancel,
  onSave,
  saving = false,
  canSave = true,
}: {
  onDelete: () => void;
  onCancel: () => void;
  // 없으면 저장 버튼이 form submit으로 동작한다.
  onSave?: () => void;
  saving?: boolean;
  canSave?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      {/* 평소엔 회색, 올리면 빨강 — 저장·취소보다 먼저 눈에 띄지 않게. 위험한 동작은 확인창에서 한 번 더 묻는다. */}
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
        삭제
      </button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button
          type={onSave ? "button" : "submit"}
          className="min-w-16"
          disabled={saving || !canSave}
          onClick={onSave}
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
