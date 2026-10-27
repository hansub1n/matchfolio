import type { Schedule } from "./types";

function parseRoundNumber(round: string): number | null {
  const match = round.match(/^(\d+)차$/);
  return match ? Number(match[1]) : null;
}

export function nextNumberedRound(round: string): string | null {
  const n = parseRoundNumber(round);
  return n === null ? null : `${n + 1}차`;
}

// 면접 일정 모달의 고정 차수 칩 — 대부분 1~2차 안에서 끝나서, 차수가 쌓일
// 때마다 칩이 계속 늘어나지 않도록 1차/2차만 고정으로 보여준다. 3차 이상이나
// 최종, 커스텀 차수는 "직접 입력"으로 다룬다.
export const ROUND_CHIPS = ["1차", "2차"];

// recordedRounds 안에서 round보다 "뒤"(나중에 기록된) 차수들 — 이전 차수로
// 되돌릴 때 사라질 기록을 미리 보여주는 경고 문구용.
export function roundsAfter(recordedRounds: string[], round: string): string[] {
  const index = recordedRounds.indexOf(round);
  if (index === -1) return [];
  return recordedRounds.slice(index + 1);
}

export interface RoundSaveResolution {
  // round와 같은 차수로 이미 기록된 행. 있으면 새로 만들지 않고 이 행을 고친다.
  existingRound: Schedule | null;
  // existingRound보다 나중에 기록된 면접 행들 — 이전 차수로 되돌리는 경우
  // 같이 지워야 "이후 기록이 안 남는다".
  roundsToDelete: Schedule[];
}

// 면접 일정을 저장할 때 새 행을 만들지, 기존 행을 고칠지(+ 그 뒤 기록을 지울지)
// 판단한다. "같은 차수 행은 지원당 하나만" 규칙을 지키기 위해 최신 행 하나만
// 보는 게 아니라 이 지원 건의 면접 행 전체에서 round와 일치하는 행을 찾는다.
export function resolveRoundSave(
  applicationSchedules: Schedule[],
  round: string
): RoundSaveResolution {
  const interviewSchedules = applicationSchedules.filter((s) => s.stage === "interview");
  const existingRound = interviewSchedules.find((s) => s.roundLabel === round) ?? null;
  if (!existingRound) {
    return { existingRound: null, roundsToDelete: [] };
  }

  const roundsToDelete = interviewSchedules.filter(
    (s) => s.id !== existingRound.id && s.createdAt > existingRound.createdAt
  );
  return { existingRound, roundsToDelete };
}
