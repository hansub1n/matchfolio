"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildYearHeatmap,
  computeLongestStreak,
  deleteApplication,
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import { recordedInterviewRounds, useScheduleRequests, type Schedule } from "@/entities/schedule";
import { todayKST } from "@/shared/lib/kst-date";
import { CreateApplicationDialog } from "@/features/create-application";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/page-layout";
import { EmptyHint, PlaceholderBar } from "@/shared/ui/placeholder";
import { ApplicationDetailDialog } from "@/widgets/kanban-board";
import { cn } from "cn";

import { computeApplicationStats } from "../model/compute-stats";
import { ActivityHeatmap } from "./activity-heatmap";
import { StageFunnel } from "./stage-funnel";
import { StatsHeadline, SummaryMetrics } from "./summary-header";
import { TechStackBars } from "./tech-stack-bars";
import { TechStackChips } from "./tech-stack-chips";
import { WaitingList } from "./waiting-list";

const SECTION = "mt-8 border-t pt-8";
const EMPTY_CHIP_WIDTHS = ["w-16", "w-20", "w-12", "w-24", "w-14"];

export function ApplicationStats({
  applications,
  schedules,
  myProjects,
}: {
  applications: Application[];
  schedules: Schedule[];
  myProjects: MyProject[];
}) {
  const router = useRouter();
  const stats = computeApplicationStats(applications, schedules);
  const today = todayKST();
  const currentYear = Number(today.slice(0, 4));
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const availableYears = Array.from(
    new Set([currentYear, ...applications.flatMap((a) => (a.appliedAt ? [Number(a.appliedAt.slice(0, 4))] : []))])
  ).sort((a, b) => b - a);
  const yearHeatmap = buildYearHeatmap(applications, selectedYear, today);
  const longestStreak = computeLongestStreak(yearHeatmap);
  const myProjectTechStack = [...new Set(myProjects.flatMap((p) => p.techStack))];

  const [scheduleItems, setScheduleItems] = useState(schedules);
  const [prevSchedules, setPrevSchedules] = useState(schedules);
  if (schedules !== prevSchedules) {
    setPrevSchedules(schedules);
    setScheduleItems(schedules);
  }
  const { latestSchedules, handleSetInterviewRound, handleSetCodingTestSchedule } =
    useScheduleRequests(applications, scheduleItems, setScheduleItems);

  const [detailId, setDetailId] = useState<string | null>(null);
  const celebrate = useFirstRecordCelebration(stats.total);
  const detailApplication = applications.find((app) => app.id === detailId) ?? null;

  function handleUpdate(id: string, input: UpdateApplicationInput) {
    updateApplication(id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  function handleDelete(id: string) {
    const app = applications.find((a) => a.id === id);
    setDetailId(null);
    deleteApplication(id, { screenshotPaths: app?.screenshotPaths })
      .then(() => router.refresh())
      .catch(console.error);
  }

  const now = new Date();

  return (
    <PageLayout
      title={<StatsHeadline headline={stats.headline} />}
      subtitle={`전체 기간 · ${now.getMonth() + 1}.${now.getDate()} 기준`}
    >
      <SummaryMetrics stats={stats} />

      <div className={`${SECTION} flex flex-col gap-3`}>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">
            {selectedYear}년에{" "}
            <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
              {yearHeatmap.totalCount}곳
            </span>
            에 지원했어요
          </p>
          <span className="flex shrink-0 items-baseline gap-2 text-[11px] text-muted-foreground">
            {availableYears.length > 1 &&
              availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    year === selectedYear ? "text-foreground" : "text-muted-foreground",
                    "hover:text-foreground"
                  )}
                >
                  {year}
                </button>
              ))}
            <span>최장 연속 {longestStreak}일</span>
            {stats.total === 0 && (
              <CreateApplicationDialog
                initialStatus="applied"
                trigger={
                  <Button variant="outline" size="sm" className="ml-1 rounded-full">
                    공고 추가
                  </Button>
                }
              />
            )}
          </span>
        </div>
        <ActivityHeatmap heatmap={yearHeatmap} celebrateDate={celebrate ? today : null} />
      </div>

      <div className={SECTION}>
        <StageFunnel steps={stats.funnel} total={stats.total} celebrate={celebrate} />
      </div>

      <div className={SECTION}>
        <WaitingList
          items={stats.inProgressList}
          emptyHint={stats.total === 0 ? "지원한 공고가 여기에 표시돼요" : "결과를 기다리는 공고가 없어요"}
          onSelect={setDetailId}
        />
      </div>

      <div className={`${SECTION} flex flex-col gap-2`}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">공고에서 요구한 기술</p>
          {stats.total > 0 && (
            <span className="text-[11px] text-muted-foreground">공고 {stats.total}개 기준</span>
          )}
        </div>
        {stats.techStackCounts.length === 0 ? (
          <div className="flex flex-col gap-2">
            <div aria-hidden className="flex flex-wrap gap-1.5 opacity-40">
              {EMPTY_CHIP_WIDTHS.map((width, i) => (
                <PlaceholderBar key={i} className={`h-[26px] ${width}`} />
              ))}
            </div>
            <EmptyHint>공고에 나온 기술이 여기에 모여요</EmptyHint>
          </div>
        ) : stats.techStackMode === "bars" ? (
          <TechStackBars techStackCounts={stats.techStackCounts} total={stats.total} />
        ) : (
          <TechStackChips techStackCounts={stats.techStackCounts} />
        )}
      </div>

      <ApplicationDetailDialog
        key={`detail-${detailApplication?.id ?? "none"}`}
        application={detailApplication}
        schedule={detailId ? (latestSchedules.get(detailId) ?? null) : null}
        interviewRounds={detailId ? recordedInterviewRounds(scheduleItems, detailId) : []}
        myProjectTechStack={myProjectTechStack}
        myProjects={myProjects}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onSaveInterviewRound={handleSetInterviewRound}
        onSaveCodingTestSchedule={handleSetCodingTestSchedule}
      />
    </PageLayout>
  );
}

const FIRST_RECORD_SEEN_KEY = "matchfolio:stats-first-record-seen";

// 첫 지원 기록이 생긴 뒤 처음 통계에 들어오면 한 번만 축하 애니메이션을 켠다. 표시 여부는
// 이 브라우저에만 기억한다(못 읽으면 그냥 생략). 개발 모드에서 effect가 두 번 돌아도
// 한 번은 보이게, "봤음" 기록은 실제로 켜는 순간에 남긴다.
function useFirstRecordCelebration(total: number): boolean {
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (total === 0) return;
    const frame = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(FIRST_RECORD_SEEN_KEY) === "1") return;
        localStorage.setItem(FIRST_RECORD_SEEN_KEY, "1");
      } catch {
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setCelebrate(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [total]);
  return celebrate;
}
