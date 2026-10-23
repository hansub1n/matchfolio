// interested: 아직 지원하지 않은 관심 공고(마감일이 중요). document부터가 지원 완료.
export type ApplicationStage = "interested" | "document" | "coding_test" | "interview";

export type ApplicationOutcome = "in_progress" | "passed" | "failed";

export interface Application {
  id: string;
  company: string;
  position: string | null;
  stage: ApplicationStage;
  outcome: ApplicationOutcome;
  appliedAt: string | null;
  deadline: string | null;
  jobPostingUrl: string | null;
  screenshotPaths: string[];
  description: string | null;
  memo: string | null;
  techStack: string[];
  createdAt: string;
  updatedAt: string;
}
