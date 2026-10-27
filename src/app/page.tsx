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
  // 첫 방문자는 아직 계정이 없다 — 빈 화면을 먼저 그리고, 브라우저에서 Turnstile을 통과하면 계정을 만든다.
  const { data: auth } = await supabase.auth.getClaims();
  const [, applications, myProjects, schedules, allProjectMatches, documents] = await Promise.all([
    // 마지막으로 들어온 날 — 1년 미접속 자동 정리 기준(020). 하루에 한 번만 실제로 쓴다. 실패해도 화면엔 영향 없음.
    auth?.claims ? supabase.rpc("touch_user_activity").then(() => undefined) : undefined,
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
      signedIn={Boolean(auth?.claims)}
    />
  );
}
