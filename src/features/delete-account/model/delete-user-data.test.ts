import { describe, expect, it } from "vitest";

import { deleteUserData, type DeletionClient } from "./delete-user-data";

// 개인정보처리방침에 "계정과 모든 기록이 바로 지워진다"고 적었다 — 순서가 틀리면 주인 없는 스크린샷이 남고,
// 한 단계 실패로 멈추면 일부만 지워진 채 남는다. 이 두 가지만 확인한다.
function fakeClient(failOn: string[] = []) {
  const calls: string[] = [];
  const step = (name: string) => {
    calls.push(name);
    if (failOn.includes(name)) throw new Error(`${name} 실패`);
  };
  const client: DeletionClient = {
    deleteRows: async (table) => step(table),
    clearFeedbackContact: async () => step("feedback_contact"),
    removeStorageFolder: async () => {
      step("storage");
      return 3;
    },
    deleteAuthUser: async () => step("auth_user"),
  };
  return { client, calls };
}

describe("deleteUserData", () => {
  it("표 → 의견 연락처 → 스크린샷 → 계정 순서로 지운다", async () => {
    const { client, calls } = fakeClient();
    const result = await deleteUserData(client, "user-1");
    expect(calls).toEqual([
      "applications",
      "schedules",
      "interview_prep",
      "project_matches",
      "my_projects",
      "documents",
      "feedback_contact",
      "storage",
      "auth_user",
    ]);
    expect(result).toEqual({ ok: true, failed: [], removedFiles: 3 });
  });

  it("중간 단계가 실패해도 멈추지 않고 계정까지 시도한 뒤 실패를 모아 알린다", async () => {
    const { client, calls } = fakeClient(["schedules", "storage"]);
    const result = await deleteUserData(client, "user-1");
    expect(calls.at(-1)).toBe("auth_user");
    expect(calls).toHaveLength(9);
    expect(result.ok).toBe(false);
    expect(result.failed.map((f) => f.step)).toEqual(["schedules", "storage"]);
    expect(result.removedFiles).toBe(0);
  });

  it("계정 삭제가 실패하면 실패로 알린다", async () => {
    const { client } = fakeClient(["auth_user"]);
    const result = await deleteUserData(client, "user-1");
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual([{ step: "auth_user", message: "auth_user 실패" }]);
  });
});
