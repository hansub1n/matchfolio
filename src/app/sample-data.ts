import { addDays, format } from "date-fns";

import type { Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import type { Schedule } from "@/entities/schedule";

// 샘플 데이터 — 지금은 화면에 쓰지 않고, 나중에 /demo 페이지에서 쓰려고 남겨둔다.
// DB에 저장하지 않고 화면에만 주입하는 용도. 날짜는 오늘
// 기준으로 계산해서 언제 봐도 "이번 주 마감", "지원 후 N일"처럼 자연스럽게 보이게 한다.
// 회사명은 실제 회사와 헷갈리지 않게 가상의 이름을 쓴다. id는 uuid 형식이어야
// 상세 모달이 기업분석/매칭을 조회할 때 형식 오류 없이 "결과 없음"으로 끝난다.
export interface SampleData {
  applications: Application[];
  schedules: Schedule[];
  projects: MyProject[];
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function buildSampleData(today: string): SampleData {
  const base = new Date(`${today}T00:00:00`);
  const day = (offset: number) => format(addDays(base, offset), "yyyy-MM-dd");
  const at = (offset: number, time: string) => `${day(offset)}T${time}:00+09:00`;
  const created = (offset: number) => `${day(offset)}T09:00:00+09:00`;

  const application = (n: number, fields: Partial<Application>): Application => ({
    id: id(n),
    company: "",
    position: "프론트엔드 개발자",
    stage: "document",
    outcome: "in_progress",
    appliedAt: null,
    deadline: null,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    submittedProjectIds: [],
    coverLetter: null,
    submissionUpdatedAt: null,
    createdAt: created(-30),
    updatedAt: created(-1),
    ...fields,
  });

  const projects: MyProject[] = [
    {
      id: id(101),
      name: "할 일 보드",
      description: "드래그로 일정을 옮기는 칸반형 할 일 관리 웹앱",
      techStack: ["React", "TypeScript", "Zustand", "dnd-kit"],
      highlights: ["낙관적 업데이트로 드래그 지연 제거", "키보드 접근성 지원"],
      createdAt: created(-60),
    },
    {
      id: id(102),
      name: "날씨 알림 봇",
      description: "아침마다 지역 날씨를 요약해 보내주는 서비스",
      techStack: ["Next.js", "Supabase", "Tailwind CSS"],
      highlights: ["서버 컴포넌트로 초기 로딩 단축", "Supabase 스케줄 함수로 매일 발송"],
      createdAt: created(-45),
    },
  ];

  const applications: Application[] = [
    application(1, {
      company: "모래알랩스",
      stage: "interested",
      deadline: day(4),
      techStack: ["React", "TypeScript", "Next.js"],
      description: "주요업무\n- 웹 서비스 프론트엔드 개발\n\n자격요건\n- React 실무 경험",
      createdAt: created(-2),
    }),
    application(2, {
      company: "토끼상점",
      position: "웹 프론트엔드 개발자",
      appliedAt: day(-6),
      techStack: ["React", "TypeScript", "GraphQL"],
      submittedProjectIds: [id(101)],
      createdAt: created(-8),
    }),
    application(3, {
      company: "파란우산",
      stage: "coding_test",
      appliedAt: day(-15),
      techStack: ["JavaScript", "React", "Webpack"],
      createdAt: created(-16),
    }),
    application(4, {
      company: "하늘페이",
      stage: "interview",
      appliedAt: day(-25),
      techStack: ["React", "TypeScript", "Jest"],
      createdAt: created(-26),
    }),
    application(5, {
      company: "구름데이터",
      outcome: "failed",
      appliedAt: day(-30),
      techStack: ["Vue", "TypeScript"],
      createdAt: created(-31),
    }),
  ];

  const schedules: Schedule[] = [
    { id: id(201), applicationId: id(3), stage: "coding_test", roundLabel: null, scheduledAt: at(2, "14:00"), createdAt: created(-5) },
    { id: id(202), applicationId: id(4), stage: "interview", roundLabel: "1차", scheduledAt: at(5, "10:00"), createdAt: created(-3) },
  ];

  return { applications, schedules, projects };
}
