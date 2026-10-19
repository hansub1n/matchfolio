export type ApplicationStage = "document" | "coding_test" | "interview";

export type ApplicationOutcome = "in_progress" | "passed" | "failed";

export interface Application {
  id: string;
  company: string;
  position: string;
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
