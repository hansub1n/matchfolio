import { getApplications } from "@/entities/application";
import { getInterestedCompanies } from "@/entities/interested-company";
import { getMyProjects } from "@/entities/my-project";
import { getAllProjectMatches } from "@/entities/project-match";
import { getSchedules } from "@/entities/schedule";

import { HomeView } from "./home-view";

// 지원 현황은 항상 최신 상태로 보여야 해서 정적 생성을 끄고 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [applications, companies, myProjects, schedules, allProjectMatches] = await Promise.all([
    getApplications(),
    getInterestedCompanies(),
    getMyProjects(),
    getSchedules(),
    getAllProjectMatches(),
  ]);

  return (
    <HomeView
      applications={applications}
      companies={companies}
      myProjects={myProjects}
      schedules={schedules}
      allProjectMatches={allProjectMatches}
    />
  );
}
