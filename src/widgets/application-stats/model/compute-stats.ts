import { isSubmitted, type Application, type ApplicationStage } from "@/entities/application";
import { latestScheduleByApplication, type Schedule } from "@/entities/schedule";

const ROUND_ORDER = ["1차", "2차", "최종"];

function roundSortKey(label: string) {
  const i = ROUND_ORDER.indexOf(label);
  return i === -1 ? ROUND_ORDER.length : i;
}

// 퍼센트를 띄워봐야 표본이 작으면 오해만 주므로, 종료된(합격+탈락) 지원이
// 이 수 미만이면 퍼센트를 숨기고 건수만 보여준다.
const MIN_SAMPLE_FOR_PERCENT = 5;

export interface FunnelFailure {
  label: string;
  count: number;
}

export interface FunnelStep {
  label: string;
  count: number;
  percent: number;
  // 바로 이전 단계에서 이 단계로 넘어오는 동안 탈락한 건들. 첫 단계(지원)는 없음.
  failures: FunnelFailure[];
  // 아직 결과가 안 나와서 탈락도 통과도 아닌 건. 빈 트랙과 구분해서 보여줘야
  // "결과 없음(탈락)"과 "아직 모름(진행 중)"이 섞이지 않는다.
  pending: number;
  pendingLabel: string | null;
}

export interface InProgressItem {
  id: string;
  company: string;
  stage: ApplicationStage;
  roundLabel: string | null;
  scheduledAt: string | null;
}

export interface Headline {
  prefix: string;
  highlight: string | null;
  suffix: string;
}

function computeHeadline(
  total: number,
  inProgressCount: number,
  finalPassedCount: number
): Headline {
  if (total === 0) {
    return { prefix: "첫 공고 스크린샷을 올려보세요", highlight: null, suffix: "" };
  }
  if (inProgressCount >= 1) {
    return {
      prefix: `지금까지 ${total}곳에 지원했고, `,
      highlight: `${inProgressCount}곳`,
      suffix: "의 결과를 기다리고 있어요",
    };
  }
  if (finalPassedCount >= 1) {
    return {
      prefix: `${total}곳 중 `,
      highlight: `${finalPassedCount}곳`,
      suffix: "에 최종 합격했어요",
    };
  }
  return { prefix: `${total}곳의 결과가 모두 나왔어요`, highlight: null, suffix: "" };
}

export interface ApplicationStats {
  total: number;
  inProgressCount: number;
  finalPassedCount: number;
  failedCount: number;
  showPercent: boolean;
  headline: Headline;
  funnel: FunnelStep[];
  inProgressList: InProgressItem[];
  techStackCounts: { tech: string; count: number }[];
  techStackMode: "chips" | "bars";
}

export function computeApplicationStats(
  allApplications: Application[],
  schedules: Schedule[] = []
): ApplicationStats {
  // 관심 단계는 아직 지원하지 않은 공고라 총 지원/퍼널/기술 집계 전부에서 뺀다.
  const applications = allApplications.filter(isSubmitted);
  const total = applications.length;
  const latestSchedules = latestScheduleByApplication(schedules);

  const documentPassedCount = applications.filter(
    (app) => app.stage !== "document" || app.outcome === "passed"
  ).length;
  const interviewReachedCount = applications.filter(
    (app) => app.stage === "interview" || app.outcome === "passed"
  ).length;
  const finalPassedCount = applications.filter((app) => app.outcome === "passed").length;
  const finishedCount = applications.filter((app) => app.outcome !== "in_progress").length;
  const showPercent = finishedCount >= MIN_SAMPLE_FOR_PERCENT;

  const percent = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const pendingAt = (stage: ApplicationStage) =>
    applications.filter((app) => app.stage === stage && app.outcome === "in_progress").length;

  const failedApps = applications.filter((app) => app.outcome === "failed");
  const documentFailures = failedApps.filter((app) => app.stage === "document").length;
  const codingTestFailures = failedApps.filter((app) => app.stage === "coding_test").length;

  const interviewRoundFailures = new Map<string, number>();
  for (const app of failedApps) {
    if (app.stage !== "interview") continue;
    const roundLabel = latestSchedules.get(app.id)?.roundLabel;
    const label = roundLabel ? `${roundLabel} 면접 탈락` : "면접(라운드 미정) 탈락";
    interviewRoundFailures.set(label, (interviewRoundFailures.get(label) ?? 0) + 1);
  }
  const interviewFailureList = [...interviewRoundFailures.entries()]
    .sort(
      (a, b) =>
        roundSortKey(a[0].replace(" 면접 탈락", "")) - roundSortKey(b[0].replace(" 면접 탈락", ""))
    )
    .map(([label, count]) => ({ label, count }));

  const documentPending = pendingAt("document");
  const codingTestPending = pendingAt("coding_test");
  const interviewPending = pendingAt("interview");

  const funnel: FunnelStep[] = [
    { label: "지원", count: total, percent: percent(total), failures: [], pending: 0, pendingLabel: null },
    {
      label: "서류 통과",
      count: documentPassedCount,
      percent: percent(documentPassedCount),
      failures: documentFailures > 0 ? [{ label: "서류 탈락", count: documentFailures }] : [],
      pending: documentPending,
      pendingLabel: "서류 검토 중",
    },
    {
      label: "면접 진출",
      count: interviewReachedCount,
      percent: percent(interviewReachedCount),
      failures:
        codingTestFailures > 0 ? [{ label: "코딩테스트 탈락", count: codingTestFailures }] : [],
      pending: codingTestPending,
      pendingLabel: "코딩테스트 진행 중",
    },
    {
      label: "최종 합격",
      count: finalPassedCount,
      percent: percent(finalPassedCount),
      failures: interviewFailureList,
      pending: interviewPending,
      pendingLabel: "결과 대기",
    },
  ];

  const inProgressList: InProgressItem[] = applications
    .filter((app) => app.outcome === "in_progress")
    .map((app) => ({
      id: app.id,
      company: app.company,
      stage: app.stage,
      roundLabel: latestSchedules.get(app.id)?.roundLabel ?? null,
      scheduledAt: latestSchedules.get(app.id)?.scheduledAt ?? null,
    }));

  const techTally = new Map<string, number>();
  for (const app of applications) {
    for (const tech of app.techStack) {
      techTally.set(tech, (techTally.get(tech) ?? 0) + 1);
    }
  }
  const techStackCounts = [...techTally.entries()]
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count);
  const techStackMode: "chips" | "bars" = techStackCounts.some((t) => t.count >= 2)
    ? "bars"
    : "chips";

  const inProgressCount = applications.filter((app) => app.outcome === "in_progress").length;

  return {
    total,
    inProgressCount,
    finalPassedCount,
    failedCount: failedApps.length,
    showPercent,
    headline: computeHeadline(total, inProgressCount, finalPassedCount),
    funnel,
    inProgressList,
    techStackCounts,
    techStackMode,
  };
}
