"use client";

import { useState } from "react";

import { Dialog, DialogContent } from "@/shared/ui/dialog";

// 모달 안에서 원본 이미지를 그대로 펼치면 너무 길어져서, 작은 썸네일만 가로로
// 나열하고 클릭하면 별도 라이트박스에서 원본 크기로 보여준다.
export function ScreenshotGallery({ paths }: { paths: string[] }) {
  const [openPath, setOpenPath] = useState<string | null>(null);

  if (paths.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {paths.map((path) => {
          const src = `/api/screenshot?path=${encodeURIComponent(path)}`;
          return (
            <button
              key={path}
              type="button"
              onClick={() => setOpenPath(path)}
              className="overflow-hidden rounded-md ring-1 ring-foreground/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="채용공고 스크린샷 썸네일"
                className="h-[72px] w-[72px] object-cover object-top"
              />
            </button>
          );
        })}
      </div>

      <Dialog open={openPath !== null} onOpenChange={(open) => !open && setOpenPath(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto p-2">
          {openPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/screenshot?path=${encodeURIComponent(openPath)}`}
              alt="채용공고 스크린샷 원본"
              className="w-full rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
