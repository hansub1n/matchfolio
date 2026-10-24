"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, FolderGit2, LayoutGrid } from "lucide-react";

import { isSubmitted, type Application } from "@/entities/application";
import type { UserDocument } from "@/entities/document";
import type { MyProject } from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import type { Schedule } from "@/entities/schedule";
import { TutorialDialog } from "@/features/onboarding";
import { ApplicationStats } from "@/widgets/application-stats";
import { BoardHeader } from "@/widgets/board-header";
import { CalendarView } from "@/widgets/calendar-view";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyMaterials } from "@/widgets/my-materials";
import { registerTabHandler } from "@/shared/lib/tab-store";
import { openTutorial } from "@/shared/lib/tutorial-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toaster } from "@/shared/ui/toast";

export function HomeView({
  applications,
  myProjects,
  documents,
  schedules,
  allProjectMatches,
}: {
  applications: Application[];
  myProjects: MyProject[];
  documents: UserDocument[];
  schedules: Schedule[];
  allProjectMatches: ProjectMatchWithCompany[];
}) {
  const [tab, setTab] = useState<string>("board");
  // 상세 모달 안의 "내 자료로 가기"처럼 깊은 곳에서 탭을 바꾸는 요청을 받는다.
  useEffect(() => registerTabHandler(setTab), []);
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
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="board">
                <LayoutGrid data-icon="inline-start" />
                보드
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays data-icon="inline-start" />
                캘린더
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 data-icon="inline-start" />
                통계
              </TabsTrigger>
              <TabsTrigger value="materials">
                <FolderGit2 data-icon="inline-start" />내 자료
              </TabsTrigger>
            </TabsList>
            <button
              type="button"
              onClick={() => openTutorial({ mode: "guide" })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              사용법
            </button>
          </div>
        </div>
        <TabsContent value="board" className="flex flex-col gap-4">
          <BoardHeader applications={applications} schedules={schedules} />
          <KanbanBoard
            applications={applications}
            schedules={schedules}
            myProjects={myProjects}
            documents={documents}
          />
        </TabsContent>
        <TabsContent value="materials">
          <MyMaterials
            projects={myProjects}
            documents={documents}
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
            documents={documents}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView
            applications={applications}
            schedules={schedules}
            myProjects={myProjects}
            documents={documents}
            onNavigateToBoard={() => setTab("board")}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
      <TutorialDialog />
    </main>
  );
}
