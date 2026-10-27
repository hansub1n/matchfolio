// 계정과 모든 기록 지우기 — "계정과 모든 기록 지우기" 버튼과 1년 미접속 자동 정리가 같이 쓴다.
// DB 표 → 의견의 연락처 → Storage 파일 → 계정 순서. 한 단계가 실패해도 멈추지 않고 남은 단계까지 시도한 뒤
// 실패한 단계를 모아서 알린다(중간에 멈추면 지워진 것과 안 지워진 것이 섞인 채로 남는다).
// 클라이언트는 주입받는다 — 실제로는 service role 어댑터(api/admin-deletion-client.ts), 테스트에선 가짜.

export const USER_TABLES = [
  "applications",
  "schedules",
  "interview_prep",
  "project_matches",
  "my_projects",
  "documents",
] as const;

export type UserTable = (typeof USER_TABLES)[number];

export interface DeletionClient {
  deleteRows(table: UserTable, userId: string): Promise<void>;
  // 의견은 남기되 누가 보냈는지 알 수 없게 — 연락처를 지운다(계정 id는 계정을 지울 때 외래키로 null이 된다).
  clearFeedbackContact(userId: string): Promise<void>;
  // 사용자 폴더({userId}/)의 스크린샷을 전부 지우고 지운 개수를 돌려준다.
  removeStorageFolder(userId: string): Promise<number>;
  deleteAuthUser(userId: string): Promise<void>;
}

export type DeletionStep = UserTable | "feedback_contact" | "storage" | "auth_user";

export interface DeletionResult {
  ok: boolean;
  failed: { step: DeletionStep; message: string }[];
  removedFiles: number;
}

export async function deleteUserData(client: DeletionClient, userId: string): Promise<DeletionResult> {
  const failed: DeletionResult["failed"] = [];
  let removedFiles = 0;

  async function attempt(step: DeletionStep, run: () => Promise<void>) {
    try {
      await run();
    } catch (error) {
      failed.push({ step, message: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const table of USER_TABLES) {
    await attempt(table, () => client.deleteRows(table, userId));
  }
  await attempt("feedback_contact", () => client.clearFeedbackContact(userId));
  await attempt("storage", async () => {
    removedFiles = await client.removeStorageFolder(userId);
  });
  // 계정은 맨 마지막 — 앞에서 실패한 표도 외래키(on delete cascade)로 같이 지워진다. Storage는 외래키가 없어서
  // 계정보다 먼저 지워야 주인 없는 파일이 남지 않는다.
  await attempt("auth_user", () => client.deleteAuthUser(userId));

  return { ok: failed.length === 0, failed, removedFiles };
}
