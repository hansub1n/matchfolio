"use client";

import type { ReactNode } from "react";
import { useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";
import { cn } from "cn";

import { getCompanyColor } from "@/shared/lib/company-color";

// 장면은 영상이 아니라 실제 화면을 단순화한 미니 UI + 약 3초 반복 애니메이션.
// 회사명은 실제 회사와 헷갈리지 않게 가상의 이름만 쓴다.
export const SAMPLE_COMPANY = "오로라랩";

const LOOP_SECONDS = 3;

export const LANE_WIDTH = 132;
export const LANE_GAP = 12;
export const LANE_STEP = LANE_WIDTH + LANE_GAP;

type Frames = Record<string, (number | string)[]>;

// 키프레임 반복 애니메이션. 모션 줄이기 설정이면 마지막 프레임에서 멈춘 화면을 보여준다.
export function useLoop() {
  const reduced = useReducedMotion() ?? false;
  return function loop(frames: Frames, times: number[]): { animate: TargetAndTransition; transition: Transition } {
    if (reduced) {
      const last = Object.fromEntries(Object.entries(frames).map(([key, values]) => [key, values[values.length - 1]]));
      return { animate: last, transition: { duration: 0 } };
    }
    return {
      animate: frames,
      transition: { duration: LOOP_SECONDS, times, repeat: Infinity, ease: "easeInOut" },
    };
  };
}

export function SceneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-full items-center justify-center p-5", className)}>{children}</div>;
}

export function MiniLane({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-[150px] flex-col gap-1.5 rounded-lg bg-lane p-1.5" style={{ width: LANE_WIDTH }}>
      <span className="px-1 text-[10px] text-muted-foreground">{title}</span>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

export function MiniLanes({ titles, children }: { titles: string[]; children?: ReactNode }) {
  return (
    <div className="relative flex" style={{ gap: LANE_GAP }}>
      {titles.map((title) => (
        <MiniLane key={title} title={title} />
      ))}
      {/* 카드는 레인 위에 절대 위치로 얹어서 x로만 옮긴다(레인 크기는 그대로). */}
      <div className="pointer-events-none absolute inset-x-0 top-[26px] px-1.5">{children}</div>
    </div>
  );
}

export function MiniCard({
  company = SAMPLE_COMPANY,
  subtitle = "프론트엔드 개발자",
  footer,
  finished = false,
  muted = false,
}: {
  company?: string;
  subtitle?: string;
  footer?: ReactNode;
  finished?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md border px-2 py-1.5 text-[10.5px]",
        finished ? "border-transparent" : "border-border bg-card"
      )}
      style={{ width: LANE_WIDTH - 12 }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn("size-3.5 shrink-0 rounded-[3px]", muted && "opacity-40")}
          style={{ backgroundColor: getCompanyColor(company).background }}
        />
        <span className={cn("truncate font-medium", muted && "text-muted-foreground")}>{company}</span>
      </div>
      <span className="truncate text-muted-foreground">{subtitle}</span>
      {footer && <div className="mt-0.5 border-t pt-0.5">{footer}</div>}
    </div>
  );
}

export function MiniBar({ className }: { className?: string }) {
  return <span className={cn("block h-1.5 rounded-full bg-border", className)} />;
}
