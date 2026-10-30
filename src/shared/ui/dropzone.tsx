"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "cn";

import { useObjectUrl } from "@/shared/lib/use-object-url";

// 사진 칸 — 추가 칸과 미리보기 칸이 같은 정사각형. 칸 폭은 아래 격자가 정한다.
const TILE = "aspect-square w-full rounded-lg";

function Thumb({ file, onRemove }: { file: File; onRemove?: () => void }) {
  const url = useObjectUrl(file);
  return (
    <div className={cn(TILE, "relative overflow-hidden border bg-card")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에만 있는 로컬 파일 미리보기 */}
      {url && <img src={url} alt="" className="size-full object-cover object-top" />}
      {onRemove && (
        <button
          type="button"
          aria-label="이 스크린샷 빼기"
          onClick={onRemove}
          className="absolute top-1 right-1 flex size-[18px] items-center justify-center rounded-full bg-foreground/60 text-background hover:bg-foreground/80"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// 드래그 드롭/클릭 선택 공용 업로드 영역. 붙여넣기(Ctrl/Cmd+V)는 다이얼로그
// 전체에서 받는 쪽이 자연스러워서 여기가 아니라 호출부(DialogContent)가 처리한다.
// - 비어 있으면 큰 점선 칸 하나.
// - files를 넘기고 한 장이라도 있으면 사진 칸으로: 미리보기들 맨 뒤에 추가 칸(아이콘 + 장 수) — 새로 넣은 사진이
//   추가 칸 앞에 이어 붙는다. 다 차면 추가 칸은 빠진다(✕로 한 장 빼면 다시 생김). 끌어다 놓기는 이 칸들 어디에나.
export function Dropzone({
  onFiles,
  files = [],
  onRemove,
  maxFiles,
  disabled,
  className,
}: {
  onFiles: (files: File[]) => void;
  files?: File[];
  onRemove?: (index: number) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const full = maxFiles !== undefined && files.length >= maxFiles;

  function openPicker() {
    if (!disabled && !full) inputRef.current?.click();
  }

  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onFiles(dropped);
    },
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      disabled={disabled}
      onChange={(e) => {
        const picked = Array.from(e.target.files ?? []);
        if (picked.length > 0) onFiles(picked);
        e.target.value = "";
      }}
      className="hidden"
    />
  );

  if (files.length > 0) {
    return (
      <div
        {...dropHandlers}
        className={cn(
          // 칸은 최대 6개(다 차면 추가 칸이 빠진다) — 데스크톱은 늘 한 줄 6칸, 휴대폰은 3칸씩 두 줄로 고르게.
          "grid grid-cols-3 gap-2 rounded-xl transition-colors sm:grid-cols-6",
          dragOver && "bg-muted",
          disabled && "pointer-events-none opacity-60",
          className
        )}
      >
        {files.map((file, i) => (
          <Thumb key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onRemove={onRemove && (() => onRemove(i))} />
        ))}
        {!full && (
          <button
            type="button"
            onClick={openPicker}
            aria-label="스크린샷 추가"
            className={cn(
              TILE,
              "flex flex-col items-center justify-center gap-1 border border-dashed text-muted-foreground transition-colors hover:bg-muted"
            )}
          >
            <ImagePlus className="size-4.5" />
            <span className="num text-[11px]">
              {files.length}
              {maxFiles !== undefined && `/${maxFiles}`}
            </span>
          </button>
        )}
        {input}
      </div>
    );
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
      {...dropHandlers}
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
      <p className="text-xs text-muted-foreground">
        {maxFiles === undefined ? "클릭해서 선택" : `최대 ${maxFiles}장 · 클릭해서 선택`}
      </p>
      {input}
    </div>
  );
}
