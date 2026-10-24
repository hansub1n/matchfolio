"use client";

import { motion } from "framer-motion";
import { cn } from "cn";

import { LANE_STEP, MiniCard, MiniLanes, SceneFrame, useLoop } from "./mini";

type Loop = ReturnType<typeof useLoop>;

// 차수 칩 하나. 선택 상태는 같은 자리에 겹쳐둔 "선택된 칩"의 투명도로만 바꾼다(크기 그대로).
function RoundChip({ label, selected, loop, times }: { label: string; selected: number[]; loop: Loop; times: number[] }) {
  return (
    <span className="relative rounded-md bg-muted px-2 py-1 text-[10.5px] text-muted-foreground">
      {label}
      <motion.span
        className="absolute inset-0 flex items-center justify-center rounded-md bg-foreground text-background"
        {...loop({ opacity: selected }, times)}
      >
        {label}
      </motion.span>
    </span>
  );
}

// 카드 하단의 면접 차수 진행 바. 칸마다 "채워진 칸"을 겹쳐두고 투명도로 늘고 준다.
function RoundBar({ filled, loop, times }: { filled: number[][]; loop: Loop; times: number[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {filled.map((opacity, i) => (
        <span key={i} className="relative h-1 w-3.5 rounded-full bg-border">
          <motion.span className="absolute inset-0 rounded-full bg-foreground" {...loop({ opacity }, times)} />
        </span>
      ))}
    </span>
  );
}

// 일정 넣기 — 코딩테스트로 옮기자 날짜 Popover가 뜬다.
export function ScheduleAddScene() {
  const loop = useLoop();
  const T = [0, 0.25, 0.45, 0.55, 1];
  return (
    <SceneFrame>
      <div className="relative">
        <MiniLanes titles={["서류", "코딩테스트"]}>
          <motion.div {...loop({ x: [0, 0, LANE_STEP, LANE_STEP, LANE_STEP] }, T)}>
            <MiniCard footer={<span className="text-[10px] text-muted-foreground">코딩테스트 · 일정 미정</span>} />
          </motion.div>
        </MiniLanes>
        <motion.div
          className="absolute top-6 left-[calc(100%+8px)] flex w-[132px] flex-col gap-1.5 rounded-lg border bg-card p-2 text-[10.5px] shadow-md"
          {...loop({ opacity: [0, 0, 0, 1, 1], y: [6, 6, 6, 0, 0] }, T)}
        >
          <span className="font-medium">코딩테스트 일정</span>
          <span className="rounded-md border px-1.5 py-1 tabular-nums">11.4 (화) 14:00</span>
          <span className="self-end rounded-md bg-foreground px-2 py-0.5 text-background">저장</span>
        </motion.div>
      </div>
    </SceneFrame>
  );
}

function InterviewCard({ bar, label }: { bar: React.ReactNode; label: React.ReactNode }) {
  return (
    <MiniCard
      footer={
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {bar}
          {label}
        </span>
      }
    />
  );
}

// 면접 차수 — 2차 칩을 고르면 진행 막대가 한 칸 늘어난다.
export function ScheduleRoundScene() {
  const loop = useLoop();
  const T = [0, 0.35, 0.45, 0.6, 0.7, 1];
  return (
    <SceneFrame className="flex-col gap-4">
      <InterviewCard
        bar={<RoundBar loop={loop} times={T} filled={[[1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]]} />}
        label={
          <span className="relative inline-block w-12">
            <motion.span className="absolute" {...loop({ opacity: [1, 1, 1, 1, 0, 0] }, T)}>1차 면접</motion.span>
            <motion.span className="absolute" {...loop({ opacity: [0, 0, 0, 0, 1, 1] }, T)}>2차 면접</motion.span>
            &nbsp;
          </span>
        }
      />
      <div className="flex gap-1">
        <RoundChip label="1차" loop={loop} times={T} selected={[1, 1, 0, 0, 0, 0]} />
        <RoundChip label="2차" loop={loop} times={T} selected={[0, 0, 1, 1, 1, 1]} />
        <RoundChip label="직접 입력" loop={loop} times={T} selected={[0, 0, 0, 0, 0, 0]} />
      </div>
    </SceneFrame>
  );
}

// 잘못 눌렀을 때 — 앞 차수(1차)를 고르면 "2차 기록이 지워져요"가 뜨고 막대가 줄어든다.
export function ScheduleRevertScene() {
  const loop = useLoop();
  const T = [0, 0.3, 0.4, 0.6, 0.7, 1];
  return (
    <SceneFrame className="flex-col gap-3">
      <InterviewCard
        bar={<RoundBar loop={loop} times={T} filled={[[1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0]]} />}
        label={
          <span className="relative inline-block w-12">
            <motion.span className="absolute" {...loop({ opacity: [1, 1, 1, 1, 0, 0] }, T)}>2차 면접</motion.span>
            <motion.span className="absolute" {...loop({ opacity: [0, 0, 0, 0, 1, 1] }, T)}>1차 면접</motion.span>
            &nbsp;
          </span>
        }
      />
      <div className="flex gap-1">
        <RoundChip label="1차" loop={loop} times={T} selected={[0, 0, 1, 1, 1, 1]} />
        <RoundChip label="2차" loop={loop} times={T} selected={[1, 1, 0, 0, 0, 0]} />
        <RoundChip label="직접 입력" loop={loop} times={T} selected={[0, 0, 0, 0, 0, 0]} />
      </div>
      {/* 경고 줄 자리는 항상 잡아둔다 — 나타나도 위 요소가 움직이지 않게. */}
      <motion.span className="h-4 text-[10.5px] text-muted-foreground" {...loop({ opacity: [0, 0, 1, 1, 1, 1] }, T)}>
        2차 기록이 지워져요
      </motion.span>
    </SceneFrame>
  );
}

// 결과 기록 — 종료로 옮기며 탈락을 고르면 "2차 면접 탈락"이 남는다.
export function ScheduleResultScene() {
  const loop = useLoop();
  const T = [0, 0.25, 0.4, 0.55, 0.7, 1];
  return (
    <SceneFrame>
      <div className="relative">
        <MiniLanes titles={["면접", "종료"]}>
          <motion.div {...loop({ x: [0, 0, LANE_STEP, LANE_STEP, LANE_STEP, LANE_STEP] }, T)}>
            <MiniCard
              footer={
                <span className="relative block h-3 text-[10px]">
                  <motion.span className="absolute text-muted-foreground" {...loop({ opacity: [1, 1, 1, 1, 0, 0] }, T)}>
                    2차 면접
                  </motion.span>
                  <motion.span className="absolute text-destructive" {...loop({ opacity: [0, 0, 0, 0, 1, 1] }, T)}>
                    2차 면접 탈락
                  </motion.span>
                </span>
              }
            />
          </motion.div>
        </MiniLanes>
        <motion.div
          className="absolute top-1/2 left-[calc(100%+8px)] flex w-[132px] -translate-y-1/2 flex-col gap-1.5 rounded-lg border bg-card p-2 text-[10.5px] shadow-md"
          {...loop({ opacity: [0, 0, 1, 1, 0, 0] }, T)}
        >
          <span className="font-medium">결과를 선택해주세요</span>
          <div className="flex gap-1">
            {["탈락", "합격"].map((label, i) => (
              <span
                key={label}
                className={cn(
                  "flex-1 rounded-md border px-1.5 py-1 text-center",
                  i === 0 ? "border-foreground bg-foreground text-background" : "border-border"
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </SceneFrame>
  );
}
