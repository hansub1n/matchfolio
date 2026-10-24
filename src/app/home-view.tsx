"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, CircleHelp, FolderGit2, LayoutGrid } from "lucide-react";

import { isSubmitted, type Application } from "@/entities/application";
import type { UserDocument } from "@/entities/document";
import type { MyProject } from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import type { Schedule } from "@/entities/schedule";
import { AnonymousSignIn } from "@/features/anonymous-sign-in";
import { AccountMenu } from "@/features/link-account";
import { TutorialDialog } from "@/features/onboarding";
import { ApplicationStats } from "@/widgets/application-stats";
import { BoardHeader } from "@/widgets/board-header";
import { CalendarView } from "@/widgets/calendar-view";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyMaterials } from "@/widgets/my-materials";
import { registerTabHandler } from "@/shared/lib/tab-store";
import { openTutorial } from "@/shared/lib/tutorial-store";
import type { TutorialChapterId } from "@/shared/config/tutorial";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toaster } from "@/shared/ui/toast";


const TUTORIAL_CHAPTER_BY_TAB: Record<string, TutorialChapterId> = {
  board: "basics",
  calendar: "schedule",
  stats: "records",
  materials: "projects",
};
export function HomeView({
  applications,
  myProjects,
  documents,
  schedules,
  allProjectMatches,
  signedIn,
}: {
  applications: Application[];
  myProjects: MyProject[];
  documents: UserDocument[];
  schedules: Schedule[];
  allProjectMatches: ProjectMatchWithCompany[];
  // 세션 쿠키가 없는 첫 방문 — 브라우저에서 익명 계정을 만든다.
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<string>("board");
  // 상세 모달 안의 "내 자료 →"처럼 깊은 곳에서 탭을 바꾸는 요청을 받는다.
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
        {/* 휴대폰: 1줄 로고 · 사용법, 2줄 탭(꽉 차게, 아이콘 숨김). sm부터는 한 줄에 로고 … 탭 · 사용법. */}
        <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-4 border-b border-border px-4 pb-4 sm:flex sm:px-6 sm:pb-6">
          <h1 className="text-xl font-bold tracking-tight">matchfolio</h1>
          <div className="col-span-2 row-start-2 sm:ml-auto">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="board" className="flex-1 sm:flex-none">
                <LayoutGrid data-icon="inline-start" className="max-sm:hidden" />
                보드
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
                <CalendarDays data-icon="inline-start" className="max-sm:hidden" />
                캘린더
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1 sm:flex-none">
                <BarChart3 data-icon="inline-start" className="max-sm:hidden" />
                통계
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 sm:flex-none">
                <FolderGit2 data-icon="inline-start" className="max-sm:hidden" />내 자료
              </TabsTrigger>
            </TabsList>
          </div>
            {/* 사용법(?)과 계정 자리 — 휴대폰에선 1줄 오른쪽, sm부터는 탭 오른쪽. */}
            <div className="col-start-2 row-start-1 flex items-center gap-2">
              {/* 지금 보고 있는 탭에 맞는 챕터부터 연다. 탭처럼 보이지 않게 아이콘만 둔 둥근 버튼 —
                  기능 옆 "?"(HelpButton)와 같은 아이콘이라 "도움말"로 읽힌다. */}
              <button
                type="button"
                onClick={() => openTutorial({ mode: "guide", chapterId: TUTORIAL_CHAPTER_BY_TAB[tab] })}
                aria-label="사용법"
                title="사용법"
                className="inline-flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <CircleHelp className="size-4" />
              </button>
              <AccountMenu
                localCounts={{ applications: applications.length, materials: myProjects.length + documents.length }}
              />
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
      {!signedIn && <AnonymousSignIn />}
      <TutorialDialog />
    </main>
  );
}
