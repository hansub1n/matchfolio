"use client";

import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

import { LANE_STEP, MiniBar, MiniCard, MiniLanes, SAMPLE_COMPANY, SceneFrame, useLoop } from "./mini";

// 공고를 올려요 — 스크린샷이 관심 레인에 떨어지고, 스켈레톤을 거쳐 카드가 된다.
export function UploadScene() {
  const loop = useLoop();
  const T = [0, 0.25, 0.35, 0.55, 0.65, 1];
  return (
    <SceneFrame>
      <MiniLanes titles={["관심", "서류"]}>
        <div className="relative h-12">
          <motion.div
            className="absolute flex h-11 w-[120px] items-center justify-center rounded-md border border-dashed border-foreground/30 bg-card"
            {...loop({ opacity: [1, 1, 0, 0, 0, 0], y: [-40, 0, 0, 0, 0, 0] }, T)}
          >
            <ImageIcon className="size-4 text-muted-foreground" />
          </motion.div>
          <motion.div
            className="absolute flex w-[120px] flex-col gap-1.5 rounded-md border bg-card px-2 py-2"
            {...loop({ opacity: [0, 0, 1, 1, 0, 0] }, T)}
          >
            <MiniBar className="w-16 animate-pulse" />
            <MiniBar className="w-20 animate-pulse" />
          </motion.div>
          <motion.div className="absolute" {...loop({ opacity: [0, 0, 0, 0, 1, 1] }, T)}>
            <MiniCard />
          </motion.div>
        </div>
      </MiniLanes>
    </SceneFrame>
  );
}

// 지원하면 옮겨요 — 카드가 관심 → 서류로 가고, 이번 주 7칸 중 오늘 칸이 채워진다.
export function ApplyScene() {
  const loop = useLoop();
  const T = [0, 0.3, 0.6, 1];
  const TODAY = 3;
  return (
    <SceneFrame className="flex-col gap-4">
      <MiniLanes titles={["관심", "서류"]}>
        <motion.div {...loop({ x: [0, 0, LANE_STEP, LANE_STEP] }, T)}>
          <MiniCard />
        </motion.div>
      </MiniLanes>
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] text-muted-foreground">이번 주</span>
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="relative size-3 rounded-[3px] bg-[var(--heat-0)]">
            {i === TODAY && (
              <motion.span
                className="absolute inset-0 rounded-[3px] bg-[var(--heat-3)]"
                {...loop({ opacity: [0, 0, 1, 1], scale: [1, 1, 1.4, 1] }, [0, 0.55, 0.7, 1])}
              />
            )}
          </span>
        ))}
      </div>
    </SceneFrame>
  );
}

// 결과에 따라 옮겨요 — 서류 → 면접 → 종료로 이어서 옮긴다.
export function ProgressScene() {
  const loop = useLoop();
  const T = [0, 0.15, 0.35, 0.5, 0.7, 1];
  return (
    <SceneFrame>
      <MiniLanes titles={["서류", "면접", "종료"]}>
        <motion.div {...loop({ x: [0, 0, LANE_STEP, LANE_STEP, LANE_STEP * 2, LANE_STEP * 2] }, T)}>
          <MiniCard
            footer={
              <span className="relative block h-3 text-[10px]">
                <motion.span className="absolute text-muted-foreground" {...loop({ opacity: [0, 0, 1, 1, 0, 0] }, T)}>
                  1차 면접
                </motion.span>
                <motion.span className="absolute" {...loop({ opacity: [0, 0, 0, 0, 1, 1] }, T)}>
                  최종 합격
                </motion.span>
              </span>
            }
          />
        </motion.div>
      </MiniLanes>
    </SceneFrame>
  );
}

// AI가 준비를 도와요 — 카드를 연 미니 모달에서 매칭 막대와 예상 질문이 차례로 나온다.
export function AiPrepScene() {
  const loop = useLoop();
  const bars = [
    { name: "할 일 보드", width: 78 },
    { name: "날씨 알림 봇", width: 46 },
  ];
  const questions = ["상태 관리를 어떻게 나눴나요?", "렌더링 성능을 개선해본 경험은?"];
  return (
    <SceneFrame>
      <div className="flex w-[300px] flex-col gap-2.5 rounded-xl border bg-card p-3 text-[10.5px] shadow-sm">
        <span className="text-[11.5px] font-medium">{SAMPLE_COMPANY}</span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-muted-foreground">프로젝트 매칭</span>
          {bars.map((bar, i) => (
            <div key={bar.name} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate">{bar.name}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full origin-left rounded-full bg-foreground"
                  style={{ width: `${bar.width}%` }}
                  {...loop({ scaleX: [0, 0, 1, 1] }, [0, 0.1 + i * 0.1, 0.4 + i * 0.1, 1])}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">예상 질문</span>
          {questions.map((q, i) => (
            <motion.span key={q} className="border-t pt-1" {...loop({ opacity: [0, 0, 1, 1] }, [0, 0.5 + i * 0.12, 0.62 + i * 0.12, 1])}>
              {q}
            </motion.span>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}

const HEAT_LEVELS = [0, 1, 0, 2, 0, 0, 1, 3, 0, 1, 0, 2, 1, 0, 0, 2, 3, 1, 0, 1, 0, 0, 2, 1, 0, 3, 1, 0];

// 흐름이 보여요 — 퍼널 막대와 잔디가 차오른다.
export function FlowScene() {
  const loop = useLoop();
  const funnel = [
    { label: "지원", value: 12, width: 100 },
    { label: "서류 통과", value: 6, width: 50 },
    { label: "면접", value: 3, width: 25 },
    { label: "합격", value: 1, width: 8 },
  ];
  return (
    <SceneFrame className="gap-8">
      <div className="grid w-[200px] grid-cols-2 gap-x-3 gap-y-2.5">
        {funnel.map((step, i) => (
          <div key={step.label} className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium tabular-nums">{step.value}</span>
            <span className="text-[10px] text-muted-foreground">{step.label}</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full origin-left rounded-full bg-foreground"
                style={{ width: `${step.width}%` }}
                {...loop({ scaleX: [0, 0, 1, 1] }, [0, 0.05 + i * 0.08, 0.35 + i * 0.08, 1])}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
        {HEAT_LEVELS.map((level, i) => (
          <span key={i} className="relative size-3 rounded-[2px] bg-[var(--heat-0)]">
            {level > 0 && (
              <motion.span
                className="absolute inset-0 rounded-[2px]"
                style={{ backgroundColor: `var(--heat-${level})` }}
                {...loop({ opacity: [0, 0, 1, 1] }, [0, 0.2 + (i / HEAT_LEVELS.length) * 0.5, 0.3 + (i / HEAT_LEVELS.length) * 0.5, 1])}
              />
            )}
          </span>
        ))}
      </div>
    </SceneFrame>
  );
}
