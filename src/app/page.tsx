import { BarChart3, CalendarDays, FolderGit2, LayoutGrid, Star } from "lucide-react";

import { getApplications } from "@/entities/application";
import { getInterestedCompanies } from "@/entities/interested-company";
import { getMyProjects } from "@/entities/my-project";
import { getSchedules } from "@/entities/schedule";
import { CreateInterestedCompanyDialog } from "@/features/create-interested-company";
import { CreateMyProjectDialog } from "@/features/create-my-project";
import { ApplicationStats } from "@/widgets/application-stats";
import { BoardHeader } from "@/widgets/board-header";
import { CalendarView } from "@/widgets/calendar-view";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyProjects } from "@/widgets/my-projects";
import { Watchlist } from "@/widgets/watchlist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// 지원 현황은 항상 최신 상태로 보여야 해서 정적 생성을 끄고 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [applications, companies, myProjects, schedules] = await Promise.all([
    getApplications(),
    getInterestedCompanies(),
    getMyProjects(),
    getSchedules(),
  ]);

  return (
    <main className="flex flex-1 flex-col py-8">
      <Tabs defaultValue="board" className="flex-1">
        <div className="flex items-center justify-between border-b border-border px-6 pb-6">
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
          <BoardHeader
            applications={applications}
            interestedCompanies={companies}
            schedules={schedules}
          />
          <KanbanBoard applications={applications} schedules={schedules} />
        </TabsContent>
        <TabsContent value="watchlist" className="flex flex-col gap-4">
          <div className="flex justify-end px-6">
            <CreateInterestedCompanyDialog />
          </div>
          <Watchlist companies={companies} />
        </TabsContent>
        <TabsContent value="my-projects" className="flex flex-col gap-4">
          <div className="flex justify-end px-6">
            <CreateMyProjectDialog />
          </div>
          <MyProjects projects={myProjects} />
        </TabsContent>
        <TabsContent value="stats">
          <ApplicationStats applications={applications} schedules={schedules} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView
            applications={applications}
            interestedCompanies={companies}
            schedules={schedules}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
