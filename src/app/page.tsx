import { getApplications } from "@/entities/application";
import { getDocuments } from "@/entities/document";
import { getMyProjects } from "@/entities/my-project";
import { getAllProjectMatches } from "@/entities/project-match";
import { getSchedules } from "@/entities/schedule";
import { createServerSupabase } from "@/shared/api/supabase-server";

import { HomeView } from "./home-view";

// 지원 현황은 항상 최신 상태로 보여야 해서 정적 생성을 끄고 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function Home() {
  // 요청 쿠키의 익명 세션으로 읽는다 — RLS 덕분에 이 사용자 데이터만 온다.
  const supabase = await createServerSupabase();
  const [applications, myProjects, schedules, allProjectMatches, documents] = await Promise.all([
    getApplications(supabase),
    getMyProjects(supabase),
    getSchedules(supabase),
    getAllProjectMatches(supabase),
    getDocuments(supabase),
  ]);

  return (
    <HomeView
      applications={applications}
      myProjects={myProjects}
      documents={documents}
      schedules={schedules}
      allProjectMatches={allProjectMatches}
    />
  );
}
