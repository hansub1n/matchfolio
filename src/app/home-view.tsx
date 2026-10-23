"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, FolderGit2, LayoutGrid, Star } from "lucide-react";

import { isSubmitted, type Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import type { Schedule } from "@/entities/schedule";
import { ApplicationStats } from "@/widgets/application-stats";
import { BoardHeader } from "@/widgets/board-header";
import { CalendarView } from "@/widgets/calendar-view";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyProjects } from "@/widgets/my-projects";
import { Watchlist } from "@/widgets/watchlist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

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
  // 관심 단계도 같은 applications에 있지만, 화면 구조를 바꾸기 전(이번 단계)까지는
  // 보드/내 프로젝트는 지원한 카드만, 관심기업 탭은 관심 단계만 보여준다.
  const submitted = applications.filter(isSubmitted);
  const interested = applications.filter((app) => !isSubmitted(app));

  // 프로젝트 모달의 "잘 맞는 공고" 클릭 — 지원 중이면 보드, 아니면 관심기업
  // 탭으로 옮겨준다. 정확히 어떤 카드인지까지 자동으로 열어주진 않는다.
  function handleNavigateToCompany(company: string) {
    if (submitted.some((app) => app.company === company)) {
      setTab("board");
    } else if (interested.some((app) => app.company === company)) {
      setTab("watchlist");
    }
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
            <TabsTrigger value="watchlist">
              <Star data-icon="inline-start" />
              관심기업
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
          <KanbanBoard applications={submitted} schedules={schedules} myProjects={myProjects} />
        </TabsContent>
        <TabsContent value="watchlist">
          <Watchlist
            companies={interested}
            allProjectMatches={allProjectMatches}
            myProjectCount={myProjects.length}
          />
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
    </main>
  );
}
