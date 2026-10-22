import type { Schedule } from "./types";

// 한 지원 건의 면접 차수 라벨을 기록된(생성) 순서대로, 중복 없이 뽑는다.
// 정상 흐름에서는 차수마다 행이 하나씩만 쌓이지만, 과거 중복 데이터가 남아있을
// 수 있어 라벨 기준으로 한 번 더 걸러준다. 진행 바 칸 수 = 이 배열의 길이.
export function recordedInterviewRounds(schedules: Schedule[], applicationId: string): string[] {
  const rows = schedules
    .filter((s) => s.applicationId === applicationId && s.stage === "interview")
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

  const seen = new Set<string>();
  const rounds: string[] = [];
  for (const row of rows) {
    if (!row.roundLabel || seen.has(row.roundLabel)) continue;
    seen.add(row.roundLabel);
    rounds.push(row.roundLabel);
  }
  return rounds;
}
