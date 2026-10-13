import { getApplications } from "@/entities/application";
import { getInterestedCompanies } from "@/entities/interested-company";
import { CreateApplicationDialog } from "@/features/create-application";
import { CreateInterestedCompanyDialog } from "@/features/create-interested-company";
import { KanbanBoard } from "@/widgets/kanban-board";
import { Watchlist } from "@/widgets/watchlist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export default async function Home() {
  const [applications, companies] = await Promise.all([
    getApplications(),
    getInterestedCompanies(),
  ]);

  return (
    <main className="flex flex-1 flex-col py-6">
      <Tabs defaultValue="board" className="flex-1">
        <div className="flex items-center justify-between px-4 pb-4">
          <h1 className="text-lg font-semibold">matchfolio</h1>
          <TabsList>
            <TabsTrigger value="board">보드</TabsTrigger>
            <TabsTrigger value="watchlist">관심기업</TabsTrigger>
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
      </Tabs>
    </main>
  );
}
