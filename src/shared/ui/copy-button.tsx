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
      className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
