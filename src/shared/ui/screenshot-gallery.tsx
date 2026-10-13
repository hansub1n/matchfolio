"use client";

import { useState } from "react";

import { Button } from "@/shared/ui/button";

export function ScreenshotGallery({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState(false);

  if (paths.length === 0) return null;

  if (!open) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        스크린샷 보기 ({paths.length}장)
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="self-start" onClick={() => setOpen(false)}>
        스크린샷 숨기기
      </Button>
      {paths.map((path) => {
        const src = `/api/screenshot?path=${encodeURIComponent(path)}`;
        return (
          <a key={path} href={src} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="채용공고 스크린샷 (클릭하면 원본 크기로 보기)"
              className="w-full rounded-md ring-1 ring-foreground/10"
            />
          </a>
        );
      })}
    </div>
  );
}
