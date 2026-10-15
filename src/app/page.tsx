import { getApplications } from "@/entities/application";
import { getInterestedCompanies } from "@/entities/interested-company";
import { getMyProjects } from "@/entities/my-project";
import { CreateApplicationDialog } from "@/features/create-application";
import { CreateInterestedCompanyDialog } from "@/features/create-interested-company";
import { CreateMyProjectDialog } from "@/features/create-my-project";
import { ApplicationStats } from "@/widgets/application-stats";
import { KanbanBoard } from "@/widgets/kanban-board";
import { MyProjects } from "@/widgets/my-projects";
import { Watchlist } from "@/widgets/watchlist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// 지원 현황은 항상 최신 상태로 보여야 해서 정적 생성을 끄고 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [applications, companies, myProjects] = await Promise.all([
    getApplications(),
    getInterestedCompanies(),
    getMyProjects(),
  ]);

  return (
    <main className="flex flex-1 flex-col py-6">
      <Tabs defaultValue="board" className="flex-1">
        <div className="flex items-center justify-between px-4 pb-4">
          <h1 className="text-lg font-semibold">matchfolio</h1>
          <TabsList>
            <TabsTrigger value="board">보드</TabsTrigger>
            <TabsTrigger value="watchlist">관심기업</TabsTrigger>
            <TabsTrigger value="my-projects">내 프로젝트</TabsTrigger>
            <TabsTrigger value="stats">통계</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="board" className="flex flex-col gap-4">
          <div className="flex justify-end px-4">
            <CreateApplicationDialog />
          </div>
          <KanbanBoard applications={applications} />
        </TabsContent>
        <TabsContent value="watchlist" className="flex flex-col gap-4">
          <div className="flex justify-end px-4">
            <CreateInterestedCompanyDialog />
          </div>
          <Watchlist companies={companies} />
        </TabsContent>
        <TabsContent value="my-projects" className="flex flex-col gap-4">
          <div className="flex justify-end px-4">
            <CreateMyProjectDialog />
          </div>
          <MyProjects projects={myProjects} />
        </TabsContent>
        <TabsContent value="stats">
          <ApplicationStats applications={applications} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
