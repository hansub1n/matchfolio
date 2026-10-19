export type ScheduleStage = "coding_test" | "interview";

export interface Schedule {
  id: string;
  applicationId: string;
  stage: ScheduleStage;
  roundLabel: string | null;
  scheduledAt: string | null;
  createdAt: string;
}
