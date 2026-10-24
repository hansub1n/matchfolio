"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toaster } from "@/shared/ui/toast";

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
  // 내 프로젝트의 "지원 공고 대비 없는 기술"은 실제로 지원한 공고 기준으로 센다.
  const submitted = applications.filter(isSubmitted);

  // 프로젝트 모달의 "잘 맞는 공고" 클릭 — 관심/지원 모두 보드에 있으니 보드로
  // 옮겨준다. 정확히 어떤 카드인지까지 자동으로 열어주진 않는다.
  function handleNavigateToCompany(company: string) {
    if (applications.some((app) => app.company === company)) setTab("board");
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
          <BoardHeader applications={applications} schedules={schedules} />
          <KanbanBoard applications={applications} schedules={schedules} myProjects={myProjects} />
        </TabsContent>
        <TabsContent value="my-projects">
          <MyProjects
            projects={myProjects}
            applications={submitted}
            allProjectMatches={allProjectMatches}
            onNavigateToCompany={handleNavigateToCompany}
          />
        </TabsContent>
        <TabsContent value="stats">
          <ApplicationStats
            applications={applications}
            schedules={schedules}
            myProjects={myProjects}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView
            applications={applications}
            schedules={schedules}
            myProjects={myProjects}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
    </main>
  );
}
