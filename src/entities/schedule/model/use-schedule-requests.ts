"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { Application } from "@/entities/application";

import { createSchedule, updateSchedule } from "../api/scheduleApi";
import { latestScheduleByApplication } from "./latest-schedule";
import { shouldUpdateExistingSchedule } from "./resolve-interview-round";
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

  function handleSetInterviewRound(id: string, round: string, scheduledAt: string | null) {
    const existing = latestSchedules.get(id);

    if (shouldUpdateExistingSchedule(existing, round)) {
      updateSchedule(existing.id, { scheduledAt })
        .then((updated) =>
          setScheduleItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        )
        .catch(console.error);
      return;
    }

    createSchedule({ applicationId: id, stage: "interview", roundLabel: round, scheduledAt })
      .then((created) => setScheduleItems((prev) => [created, ...prev]))
      .catch(console.error);
  }

  function handleSetCodingTestSchedule(id: string, scheduledAt: string | null) {
    setPendingCodingTestId(null);
    const existing = scheduleItems.find((s) => s.applicationId === id && s.stage === "coding_test");

    if (existing) {
      updateSchedule(existing.id, { scheduledAt })
        .then((updated) =>
          setScheduleItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        )
        .catch(console.error);
      return;
    }

    createSchedule({ applicationId: id, stage: "coding_test", scheduledAt })
      .then((created) => setScheduleItems((prev) => [created, ...prev]))
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
