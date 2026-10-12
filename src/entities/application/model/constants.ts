import type { ApplicationStatus } from "./types";

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "지원완료" },
  { value: "document_passed", label: "서류합격" },
  { value: "coding_test", label: "코딩테스트" },
  { value: "interview", label: "면접" },
  { value: "result", label: "결과" },
];
