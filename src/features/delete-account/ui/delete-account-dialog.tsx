"use client";

import { useState } from "react";

import { getBrowserSupabase, setSessionOnlyLogin } from "@/shared/api/supabase";
import { ConfirmDeleteDialog } from "@/shared/ui/confirm-delete-dialog";

async function deleteAccount(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/account/delete", { method: "POST" });
  } catch {
    throw new Error("네트워크 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "지우지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  // 서버에서 계정이 지워졌으니 이 브라우저의 세션 쿠키도 지우고 처음 화면으로 — 새 익명 계정으로 시작한다.
  await getBrowserSupabase().auth.signOut().catch(() => undefined);
  setSessionOnlyLogin(false);
  window.location.replace("/");
}

// 계정과 모든 기록 지우기 확인 — 계정 메뉴와 개인정보처리방침 페이지가 같은 창을 연다.
export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      subject="계정"
      title="계정과 모든 기록을 지울까요?"
      description="모든 공고, 일정, 내 자료, 분석 결과가 지워지고 되돌릴 수 없어요."
      onConfirm={deleteAccount}
    />
  );
}

// 개인정보처리방침 페이지의 "계정 지우기" 버튼(서버 컴포넌트 안에 두려고 따로 뺐다).
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent max-sm:px-4 max-sm:py-2.5 max-sm:text-[13px]"
      >
        계정 지우기
      </button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
