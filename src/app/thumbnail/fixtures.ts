import { addDays, format } from "date-fns";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import { buildSampleData } from "../sample-data";

// 썸네일용 데이터 — /demo용으로 남겨둔 샘플(sample-data.ts)을 바탕으로, 썸네일에 필요한 것만 맞춘다.
// 관심·서류·코딩테스트·면접에 카드가 고르게 있고, 관심 하나는 D-3 마감, 면접 하나는 일정이 있게.
// 회사명은 전부 가상의 이름이다.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function buildThumbnailData(today: string): { applications: Application[]; schedules: Schedule[] } {
  const sample = buildSampleData(today);
  const base = new Date(`${today}T00:00:00`);
  const day = (offset: number) => format(addDays(base, offset), "yyyy-MM-dd");
  const template = sample.applications[0];

  const extra = (n: number, fields: Partial<Application>): Application => ({
    ...template,
    id: id(n),
    description: null,
    ...fields,
  });

  const applications: Application[] = [
    // 샘플의 관심 카드는 D-3으로 당긴다.
    ...sample.applications.map((app) => (app.stage === "interested" ? { ...app, deadline: day(3) } : app)),
    extra(11, {
      company: "파인트리",
      position: "주니어 프론트엔드 엔지니어",
      stage: "interested",
      deadline: day(12),
      techStack: ["React", "Zustand", "Tailwind CSS"],
    }),
    extra(12, {
      company: "노을소프트",
      position: "프론트엔드 개발자 (신입)",
      stage: "document",
      deadline: null,
      appliedAt: day(-3),
      techStack: ["Next.js", "TypeScript"],
    }),
    extra(13, {
      company: "브릿지웍스",
      position: "웹 서비스 프론트엔드",
      stage: "interview",
      deadline: null,
      appliedAt: day(-20),
      techStack: ["React", "GraphQL"],
    }),
  ];

  return { applications, schedules: sample.schedules };
}
