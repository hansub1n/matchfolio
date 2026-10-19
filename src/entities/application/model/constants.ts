import type { ApplicationStage } from "./types";

export const APPLICATION_STAGES: { value: ApplicationStage; label: string }[] = [
  { value: "document", label: "서류" },
  { value: "coding_test", label: "코딩테스트" },
  { value: "interview", label: "면접" },
];
