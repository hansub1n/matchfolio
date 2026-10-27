"use client";

import { useState, type FormEvent } from "react";
import { cn } from "cn";
import Link from "next/link";

import { track, type FeedbackKind } from "@/shared/lib/analytics";
import { closeFeedback, useFeedbackState, type FeedbackRequest } from "@/shared/lib/feedback-store";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

import { sendFeedback } from "../api/sendFeedback";

const KIND_OPTIONS: { value: FeedbackKind; label: string; placeholder: string }[] = [
  { value: "inconvenient", label: "불편해요", placeholder: "어떤 점이 불편했는지 알려주세요" },
  { value: "idea", label: "이런 기능 있으면", placeholder: "있었으면 하는 기능을 알려주세요" },
  { value: "good", label: "좋았어요", placeholder: "어떤 점이 좋았는지 알려주세요" },
];

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// 의견 보내기 — 종류 하나 고르고, 내용, 답장 받을 연락처(선택). 계정 메뉴·화면 아래 링크·공고 추출 실패 화면에서 연다
// (feedback-store). 보내면 같은 크기 그대로 "보내주셔서 고마워요" 한 줄만 남긴다.
export function FeedbackDialog() {
  const { request, version } = useFeedbackState();
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && closeFeedback()}>
      {request && <FeedbackForm key={version} request={request} />}
    </Dialog>
  );
}

function FeedbackForm({ request }: { request: FeedbackRequest }) {
  const [kind, setKind] = useState<FeedbackKind>(request.kind ?? "inconvenient");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const placeholder = KIND_OPTIONS.find((option) => option.value === kind)?.placeholder;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await sendFeedback({
        kind,
        message: message.trim(),
        contact: contact.trim() || null,
        page: request.page ?? window.location.pathname,
      });
      track("feedback_sent", { kind });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "보내지 못했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>의견 보내기</DialogTitle>
        <DialogDescription className="text-xs">불편한 점이나 바라는 기능을 알려주시면 다음 작업에 반영할게요.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* 보낸 뒤에도 폼 자리를 그대로 두고(invisible) 그 위에 한 줄만 띄운다 — 모달 크기가 바뀌지 않게. */}
        <div className="grid">
          <div className={cn("col-start-1 row-start-1 flex flex-col gap-3", sent && "invisible")}>
            <div role="radiogroup" aria-label="의견 종류" className="flex gap-1 self-start rounded-full bg-muted p-0.5">
              {KIND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === option.value}
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs max-sm:px-3.5 max-sm:py-2 max-sm:text-[13px]",
                    kind === option.value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              maxLength={2000}
              rows={6}
              className={inputClassName}
              aria-label="의견 내용"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="답장 받을 연락처 (선택) — 이메일 등"
              maxLength={200}
              className={inputClassName}
              aria-label="답장 받을 연락처"
            />
            {/* 생겼다 사라지는 줄이라 자리를 미리 둔다. */}
            <p className="min-h-4 text-xs text-destructive">{error}</p>
            <p className="text-[11.5px] text-muted-foreground">
              의견은 받은 날부터 3년 보관해요 ·{" "}
              <Link href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">
                개인정보처리방침
              </Link>
            </p>
          </div>
          {sent && (
            <p role="status" className="col-start-1 row-start-1 self-center text-center text-sm">
              보내주셔서 고마워요
            </p>
          )}
        </div>
        <DialogFooter>
          {sent ? (
            <Button type="button" variant="outline" className="min-w-16" onClick={closeFeedback}>
              닫기
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={closeFeedback}>
                취소
              </Button>
              <Button type="submit" className="min-w-20" disabled={pending || !message.trim()}>
                {pending ? "보내는 중..." : "보내기"}
              </Button>
            </>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
