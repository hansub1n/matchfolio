"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import type { Application } from "@/entities/application";

import { deleteSchedules, updateSchedule, upsertSchedule } from "../api/scheduleApi";
import { latestScheduleByApplication } from "./latest-schedule";
import { resolveRoundSave } from "./resolve-interview-round";
import type { Schedule } from "./types";

// 면접/코딩테스트 일정을 "물어보고 저장"하는 두 뮤테이션(생성-vs-수정 판단 포함)을
// 보드와 캘린더 양쪽에서 똑같이 쓰기 때문에 훅으로 분리했다. 면접 쪽 Popover는
// 이제 카드/목록 항목 각자가 자기 위치에 붙여서 여는 구조라 "열려 있는 지원 건"
// 상태는 여기서 들고 있지 않다 — 코딩테스트(여전히 중앙 Dialog라 상태가 필요함)와
// 드래그로 막 면접 컬럼에 들어온 카드가 자기 Popover를 자동으로 열어야 하는
// 경우(autoOpenRoundId)만 예외로 남아 있다.
export function useScheduleRequests(
  applications: Application[],
  scheduleItems: Schedule[],
  setScheduleItems: Dispatch<SetStateAction<Schedule[]>>
) {
  const router = useRouter();
  const latestSchedules = useMemo(
    () => latestScheduleByApplication(scheduleItems),
    [scheduleItems]
  );

  const [autoOpenRoundId, setAutoOpenRoundId] = useState<string | null>(null);
  const [pendingCodingTestId, setPendingCodingTestId] = useState<string | null>(null);

  const pendingCodingTestApplication =
    applications.find((app) => app.id === pendingCodingTestId) ?? null;
  const pendingCodingTestSchedule = pendingCodingTestApplication
    ? (scheduleItems.find(
        (s) => s.applicationId === pendingCodingTestApplication.id && s.stage === "coding_test"
      ) ?? null)
    : null;

  // 같은 차수를 다시 저장하면 그 행만 고치고, 기록에 없는 차수면 새로 쌓는다.
  // 현재보다 앞 차수로 되돌리는 경우엔 그 뒤에 쌓인 행들을 같이 지운다 —
  // resolveRoundSave가 이 지원 건의 면접 행 "전체"에서 판단하므로, 가장 최근
  // 행만 보고 "이미 있는 차수인데도" 중복으로 새로 쌓이던 문제가 생기지 않는다.
  function handleSetInterviewRound(id: string, round: string, scheduledAt: string | null) {
    const applicationSchedules = scheduleItems.filter((s) => s.applicationId === id);
    const { existingRound, roundsToDelete } = resolveRoundSave(applicationSchedules, round);

    if (existingRound) {
      const deleteIds = roundsToDelete.map((s) => s.id);
      Promise.all([
        updateSchedule(existingRound.id, { scheduledAt }),
        deleteIds.length > 0 ? deleteSchedules(deleteIds) : Promise.resolve(),
      ])
        .then(([updated]) => {
          setScheduleItems((prev) =>
            prev
              .filter((s) => !deleteIds.includes(s.id))
              .map((s) => (s.id === updated.id ? updated : s))
          );
          router.refresh();
        })
        .catch(console.error);
      return;
    }

    // insert가 아니라 upsert — (application_id, stage, round_label) 유니크 제약의
    // 보호 하에, 혹시 위 판단이 틀려도 DB가 중복 대신 그 행을 고치는 쪽으로
    // 떨어진다. 그 경우를 대비해 로컬 상태도 id로 교체(동일 id 중복 방지)한다.
    upsertSchedule({ applicationId: id, stage: "interview", roundLabel: round, scheduledAt })
      .then((saved) => {
        setScheduleItems((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
        router.refresh();
      })
      .catch(console.error);
  }

  function handleSetCodingTestSchedule(id: string, scheduledAt: string | null) {
    setPendingCodingTestId(null);
    const existing = scheduleItems.find((s) => s.applicationId === id && s.stage === "coding_test");

    if (existing) {
      updateSchedule(existing.id, { scheduledAt })
        .then((updated) => {
          setScheduleItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          router.refresh();
        })
        .catch(console.error);
      return;
    }

    upsertSchedule({ applicationId: id, stage: "coding_test", scheduledAt })
      .then((saved) => {
        setScheduleItems((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
        router.refresh();
      })
      .catch(console.error);
  }

  return {
    latestSchedules,
    autoOpenRoundId,
    setAutoOpenRoundId,
    pendingCodingTestId,
    setPendingCodingTestId,
    pendingCodingTestApplication,
    pendingCodingTestSchedule,
    handleSetInterviewRound,
    handleSetCodingTestSchedule,
  };
}
