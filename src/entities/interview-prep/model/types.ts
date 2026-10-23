export interface InterviewPrepSection {
  title: string;
  points: string[];
}

export type InterviewPrepQuestionCategory = "기술" | "프로젝트 경험" | "회사·도메인" | "협업";

export interface InterviewPrepQuestion {
  category: InterviewPrepQuestionCategory;
  question: string;
  intent: string;
  hint: string;
  // hint가 등록된 내 프로젝트 중 특정 하나를 근거로 하면 그 프로젝트 id.
  relatedProjectId: string | null;
  // 등록된 프로젝트 중 이 질문에 답할 근거가 전혀 없으면 true.
  noExperience: boolean;
}

// 목록형 값(기술스택 등)은 여기 담지 않는다 — sections에만 쓴다. 전부 "짧은
// 단일 값"만 다루는 항목이라 라벨을 고정해두고 화면에서 라벨별로 다르게 포맷한다.
export type InterviewPrepFactLabel = "설립연도" | "업종" | "직원수" | "매출" | "투자단계";

export interface InterviewPrepFact {
  label: InterviewPrepFactLabel;
  value: string;
  source: string;
  // "매출 2,409만원 (2024)"처럼 값이 특정 연도 기준일 때만. 없으면 null.
  asOf: string | null;
}

export interface InterviewPrepReverseQuestion {
  question: string;
  why: string;
}

// 면접 준비용 고정 구조. 외부 근거가 없는 항목은 빈 배열.
export interface InterviewPrepBriefing {
  business: string[];
  recent: string[];
  reverseQuestions: InterviewPrepReverseQuestion[];
}

export interface InterviewPrepMotivation {
  point: string;
  // 자소서에 바로 넣을 수 있는 1~2문장. 프로젝트에 실제로 있는 사실만.
  example: string;
}

export interface InterviewPrepSource {
  title: string;
  url: string;
  // 뉴스 검색으로 찾은 자료는 "최근 기사"로 따로 보여준다. 구버전 데이터엔 없음.
  kind?: "news";
}

export interface InterviewPrep {
  id: string;
  applicationId: string;
  summary: string | null;
  facts: InterviewPrepFact[] | null;
  briefing: InterviewPrepBriefing | null;
  // 고정 구조(briefing) 이전의 자유 섹션 — 새 분석부터는 채우지 않는다.
  sections: InterviewPrepSection[] | null;
  // "기본 질문" — 공고/회사 정보만으로 생성, "다시 분석"에만 갱신된다.
  questions: InterviewPrepQuestion[] | null;
  confidence: "high" | "low" | null;
  // "내 프로젝트 기반 질문" — 프로젝트가 있을 때만 별도로 생성/갱신된다.
  projectQuestions: InterviewPrepQuestion[] | null;
  // "지원 동기에 쓸 포인트" — 프로젝트 정보가 필요해서 프로젝트 기반 질문과
  // 같이 생성/갱신된다.
  motivation: InterviewPrepMotivation[] | null;
  projectQuestionsUpdatedAt: string | null;
  // 구조화 이전에 저장된 레코드 — 새 분석부터는 채워지지 않는다. 화면에서 이
  // 필드가 있으면(= briefing/sections가 둘 다 null이면) 구버전 레이아웃으로 보여준다.
  companyAnalysis: string | null;
  interviewQuestions: string[] | null;
  sources: InterviewPrepSource[];
  createdAt: string;
  updatedAt: string;
}

export function isLegacyInterviewPrep(prep: InterviewPrep): boolean {
  return prep.briefing === null && prep.sections === null;
}
