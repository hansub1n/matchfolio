import type { Schedule } from "./types";

// 같은 차수의 일정만 고치는 경우엔 기존 행을 업데이트하고, 차수가 바뀌었거나
// (혹은 처음 잡는 차수면) 새 행을 쌓아 이전 차수 기록이 남게 한다.
export function shouldUpdateExistingSchedule(
  existing: Schedule | undefined,
  round: string
): existing is Schedule {
  return existing !== undefined && existing.stage === "interview" && existing.roundLabel === round;
}

const ROUND_SEQUENCE = ["1차", "2차", "3차", "최종"];

// 면접 일정 Popover의 차수 칩 목록. 현재 차수가 없으면(처음 면접 컬럼에 들어온
// 경우) 1차/2차/최종만 보여주고, 있으면 그 차수부터 뒤를 전부 보여준다(이미 지난
// 차수 칩은 숨김). 고정 순서에 없는 커스텀 차수면 현재 차수 칩 하나만 남긴다.
export function buildRoundChips(currentRound: string | null): string[] {
  if (!currentRound) return ["1차", "2차", "최종"];
  const index = ROUND_SEQUENCE.indexOf(currentRound);
  if (index === -1) return [currentRound];
  return ROUND_SEQUENCE.slice(index);
}
