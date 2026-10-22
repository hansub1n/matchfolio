"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "cn";

// 드래그 드롭/클릭 선택 공용 업로드 영역. 붙여넣기(Ctrl/Cmd+V)는 다이얼로그
// 전체에서 받는 쪽이 자연스러워서 여기가 아니라 호출부(DialogContent)가 처리한다.
export function Dropzone({
  onFiles,
  disabled,
  className,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      aria-disabled={disabled}
      className={cn(
        "flex h-44 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/50 px-4 text-center transition-colors",
        dragOver && "bg-muted",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <ImagePlus className="size-5 text-muted-foreground" />
      <p className="text-sm">공고 스크린샷을 끌어다 놓거나 붙여넣으세요</p>
      <p className="text-xs text-muted-foreground">여러 장이면 한 번에 올려도 돼요 · 클릭해서 선택</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
