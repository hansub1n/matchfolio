"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, FolderGit2, LayoutGrid } from "lucide-react";

import { isSubmitted, type Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import type { Schedule } from "@/entities/schedule";
import { ApplicationStats } from "@/widgets/application-stats";
import { BoardHeader } from "@/widgets/board-header";
import { CalendarView } from "@/widgets/calendar-view";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyProjects } from "@/widgets/my-projects";
import { todayKST } from "@/shared/lib/kst-date";
import { setSampleModeActive } from "@/shared/lib/sample-mode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toaster } from "@/shared/ui/toast";

import { SampleDataBar } from "./sample-data-bar";
import { buildSampleData } from "./sample-data";

export function HomeView({
  applications,
  myProjects,
  schedules,
  allProjectMatches,
}: {
  applications: Application[];
  myProjects: MyProject[];
  schedules: Schedule[];
  allProjectMatches: ProjectMatchWithCompany[];
}) {
  const [tab, setTab] = useState("board");
  const [sampleOn, setSampleOn] = useState(false);
  const sample = useMemo(() => buildSampleData(todayKST()), []);

  // 예시 데이터는 실제 데이터가 0건인 쪽만 대신한다(공고가 있으면 공고는 그대로).
  const sampleApplications = sampleOn && applications.length === 0;
  const sampleProjects = sampleOn && myProjects.length === 0;
  const viewApplications = sampleApplications ? sample.applications : applications;
  const viewSchedules = sampleApplications ? sample.schedules : schedules;
  const viewProjects = sampleProjects ? sample.projects : myProjects;
  // 내 프로젝트의 "지원 공고 대비 없는 기술"은 실제로 지원한 공고 기준으로 센다.
  const submitted = viewApplications.filter(isSubmitted);

  function toggleSample(next: boolean) {
    // 저장/AI 호출을 막는 플래그는 화면 전환과 같은 순간에 바뀌어야 한다.
    setSampleModeActive(next);
    setSampleOn(next);
  }

  // 프로젝트 모달의 "잘 맞는 공고" 클릭 — 관심/지원 모두 보드에 있으니 보드로
  // 옮겨준다. 정확히 어떤 카드인지까지 자동으로 열어주진 않는다.
  function handleNavigateToCompany(company: string) {
    if (viewApplications.some((app) => app.company === company)) setTab("board");
  }

  return (
    <main className="flex flex-1 flex-col py-8">
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 pb-6">
          <h1 className="text-xl font-bold tracking-tight">matchfolio</h1>
          <TabsList>
            <TabsTrigger value="board">
              <LayoutGrid data-icon="inline-start" />
              보드
            </TabsTrigger>
            <TabsTrigger value="my-projects">
              <FolderGit2 data-icon="inline-start" />내 프로젝트
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 data-icon="inline-start" />
              통계
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays data-icon="inline-start" />
              캘린더
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="board" className="flex flex-col gap-4">
          <BoardHeader applications={viewApplications} schedules={viewSchedules} />
          <SampleDataBar
            available={applications.length === 0}
            showing={sampleApplications}
            onToggle={toggleSample}
          />
          <KanbanBoard applications={viewApplications} schedules={viewSchedules} myProjects={viewProjects} />
        </TabsContent>
        <TabsContent value="my-projects" className="flex flex-col">
          <SampleDataBar
            available={myProjects.length === 0}
            showing={sampleProjects}
            onToggle={toggleSample}
            className="mx-auto w-full max-w-[880px] pt-6"
          />
          <MyProjects
            projects={viewProjects}
            applications={submitted}
            allProjectMatches={allProjectMatches}
            onNavigateToCompany={handleNavigateToCompany}
          />
        </TabsContent>
        <TabsContent value="stats" className="flex flex-col">
          <SampleDataBar
            available={applications.length === 0}
            showing={sampleApplications}
            onToggle={toggleSample}
            className="mx-auto w-full max-w-[720px] pt-6"
          />
          <ApplicationStats
            applications={viewApplications}
            schedules={viewSchedules}
            myProjects={viewProjects}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView
            applications={viewApplications}
            schedules={viewSchedules}
            myProjects={viewProjects}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
    </main>
  );
}
