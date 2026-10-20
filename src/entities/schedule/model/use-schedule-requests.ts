"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { Application } from "@/entities/application";

import { createSchedule, updateSchedule } from "../api/scheduleApi";
import { latestScheduleByApplication } from "./latest-schedule";
import { shouldUpdateExistingSchedule } from "./resolve-interview-round";
import type { Schedule } from "./types";

// 면접 차수/코딩테스트 일정을 "물어보고 저장"하는 흐름은 보드(드래그 트리거)와
// 캘린더(일정 미정 목록의 "날짜 입력" 버튼) 양쪽에서 똑같이 필요해서 훅으로 분리했다.
export function useScheduleRequests(
  applications: Application[],
  scheduleItems: Schedule[],
  setScheduleItems: Dispatch<SetStateAction<Schedule[]>>
) {
  const latestSchedules = useMemo(
    () => latestScheduleByApplication(scheduleItems),
    [scheduleItems]
  );

  const [pendingRoundId, setPendingRoundId] = useState<string | null>(null);
  const [pendingCodingTestId, setPendingCodingTestId] = useState<string | null>(null);

  const pendingRoundApplication = applications.find((app) => app.id === pendingRoundId) ?? null;
  const pendingRoundSchedule = pendingRoundApplication
    ? (latestSchedules.get(pendingRoundApplication.id) ?? null)
    : null;

  const pendingCodingTestApplication =
    applications.find((app) => app.id === pendingCodingTestId) ?? null;
  const pendingCodingTestSchedule = pendingCodingTestApplication
    ? (scheduleItems.find(
        (s) => s.applicationId === pendingCodingTestApplication.id && s.stage === "coding_test"
      ) ?? null)
    : null;

  function handleSetInterviewRound(id: string, round: string, scheduledAt: string | null) {
    setPendingRoundId(null);
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
    pendingRoundId,
    setPendingRoundId,
    pendingRoundApplication,
    pendingRoundSchedule,
    pendingCodingTestId,
    setPendingCodingTestId,
    pendingCodingTestApplication,
    pendingCodingTestSchedule,
    handleSetInterviewRound,
    handleSetCodingTestSchedule,
  };
}
