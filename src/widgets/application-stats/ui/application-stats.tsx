"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import { latestScheduleByApplication, type Schedule } from "@/entities/schedule";
import { CreateApplicationDialog } from "@/features/create-application";
import { ApplicationDetailDialog } from "@/widgets/kanban-board";

import { computeApplicationStats } from "../model/compute-stats";
import { StageFunnel } from "./stage-funnel";
import { SummaryHeader } from "./summary-header";
import { TechStackBars } from "./tech-stack-bars";
import { TechStackChips } from "./tech-stack-chips";
import { WaitingList } from "./waiting-list";

const SECTION = "mt-8 border-t pt-8";

export function ApplicationStats({
  applications,
  schedules,
}: {
  applications: Application[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const stats = computeApplicationStats(applications, schedules);
  const latestSchedules = latestScheduleByApplication(schedules);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailApplication = applications.find((app) => app.id === detailId) ?? null;

  function handleUpdate(id: string, input: UpdateApplicationInput) {
    updateApplication(id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  if (stats.total === 0) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-6 pt-10">
        <p className="text-[26px] leading-snug font-medium tracking-tight">
          첫 공고 스크린샷을 올려보세요
        </p>
        <CreateApplicationDialog />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-6 pt-10 pb-8">
      <SummaryHeader stats={stats} />

      <div className={SECTION}>
        <StageFunnel steps={stats.funnel} total={stats.total} />
      </div>

      {stats.inProgressList.length > 0 && (
        <div className={SECTION}>
          <WaitingList items={stats.inProgressList} onSelect={setDetailId} />
        </div>
      )}

      {stats.techStackCounts.length > 0 && (
        <div className={`${SECTION} flex flex-col gap-2`}>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">공고에서 요구한 기술</p>
            <span className="text-[11px] text-muted-foreground">공고 {stats.total}개 기준</span>
          </div>
          {stats.techStackMode === "bars" ? (
            <TechStackBars techStackCounts={stats.techStackCounts} total={stats.total} />
          ) : (
            <TechStackChips techStackCounts={stats.techStackCounts} />
          )}
        </div>
      )}

      <ApplicationDetailDialog
        application={detailApplication}
        schedule={detailId ? (latestSchedules.get(detailId) ?? null) : null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
