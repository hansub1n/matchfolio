export type ApplicationStatus =
  | "applied"
  | "document_passed"
  | "coding_test"
  | "interview"
  | "result";

export type ApplicationResult = "passed" | "failed";

export interface Application {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  interviewRound: string | null;
  result: ApplicationResult | null;
  appliedAt: string | null;
  deadline: string | null;
  jobPostingUrl: string | null;
  memo: string | null;
  techStack: string[];
  createdAt: string;
  updatedAt: string;
}
