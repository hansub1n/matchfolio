import type { Schedule } from "@/entities/schedule";

// 같은 차수의 일정만 고치는 경우엔 기존 행을 업데이트하고, 차수가 바뀌었거나
// (혹은 처음 잡는 차수면) 새 행을 쌓아 이전 차수 기록이 남게 한다.
export function shouldUpdateExistingSchedule(
  existing: Schedule | undefined,
  round: string
): existing is Schedule {
  return existing !== undefined && existing.stage === "interview" && existing.roundLabel === round;
}
