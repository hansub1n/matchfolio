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
  // 제출 기록 — 지원할 때 어필한 프로젝트(my_projects id)와 어떤 자소서(documents)로
  // 냈는지. 프로젝트 기반 예상 질문 생성에 쓰인다. 삭제된 id는 읽을 때 무시한다.
  submittedProjectIds: string[];
  submittedCoverLetterId: string | null;
  submissionUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
