"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("클립보드 복사 실패:", err);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      // "복사"↔"복사됨"으로 글자가 바뀌어도 자리가 그대로이도록 폭을 고정한다.
      className="w-9 shrink-0 text-right text-[11px] text-muted-foreground hover:text-foreground"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
