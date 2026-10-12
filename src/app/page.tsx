import { KanbanBoard, dummyApplications } from "@/widgets/kanban-board";
import { Watchlist, dummyInterestedCompanies } from "@/widgets/watchlist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export default function Home() {
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
        <TabsContent value="board">
          <KanbanBoard applications={dummyApplications} />
        </TabsContent>
        <TabsContent value="watchlist">
          <Watchlist companies={dummyInterestedCompanies} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
