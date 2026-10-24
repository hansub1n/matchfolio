export interface ProjectMatchEvidence {
  requirement: string;
  experience: string;
}

// 구버전 캐시(projectName/reason/highlightPoints)와 신버전(projectId/summary/
// evidence/gaps/pitch)이 섞여 있을 수 있다. projectName은 둘 다에 있어서(신버전은
// 읽을 때 my_projects.name으로 조인해서 채움) 기존 화면들이 거의 그대로 돌아간다.
export interface LegacyProjectMatchItem {
  projectName: string;
  fitScore: number;
  reason: string;
  highlightPoints: string[];
}

export interface DetailedProjectMatchItem {
  projectId: string;
  projectName: string;
  fitScore: number;
  summary: string;
  evidence: ProjectMatchEvidence[];
  gaps: string[];
  pitch: string;
}

export type ProjectMatchItem = LegacyProjectMatchItem | DetailedProjectMatchItem;

export function isDetailedProjectMatch(item: ProjectMatchItem): item is DetailedProjectMatchItem {
  return "projectId" in item;
}

// 공고 매칭의 자소서 첨삭 — 고칠 문장과 이유, 고친 예시. 내 자료의 자소서 원문을 기준으로 한다.
export interface CoverLetterEdit {
  original: string;
  suggestion: string;
  reason: string;
}

// 자소서 지원 동기에 쓸 포인트 — 회사 사업과 내 자료를 연결한 한 줄 + 자소서에 바로 넣을 예시 문장.
export interface MotivationPoint {
  point: string;
  example: string;
}

export interface ApplicationReview {
  // 기준으로 삼은 자소서(제출 자료 → 대표 → 최근 순). 자소서가 없으면 null.
  // editsSkipped: 공고와 기술이 거의 안 겹쳐서 첨삭을 만들지 않았을 때.
  coverLetter: {
    documentId: string;
    title: string;
    edits: CoverLetterEdit[];
    editsSkipped?: "low_fit";
  } | null;
  // 이 공고 기준으로 이력서에서 강조할 점. 이력서가 없으면 빈 배열.
  resumeTips: string[];
  // 구버전 캐시(지원 동기를 면접 준비 쪽에서 만들던 때)엔 없다.
  motivation?: MotivationPoint[];
  // 공고 전체 기준 맨 위 1~2문장. 거의 안 맞는 공고(적합도 low)면 부족한 점을 인정하고 가까운 경험으로
  // 메울 방법(gap), 어느 정도 맞으면 공고 핵심 업무에 맞닿은 경험을 묶은 내세울 점(strength).
  opener?: { kind: "gap" | "strength"; text: string };
  // 구버전 캐시 — 적합도와 상관없이 항상 부족한 점을 만들던 때. 화면에선 적합도 low일 때만 보여준다.
  gapStatement?: string;
}

export interface ProjectMatches {
  id: string;
  applicationId: string;
  recommendation: string | null;
  // 구버전(프로젝트 매칭만 하던 때) 캐시는 null.
  review: ApplicationReview | null;
  matches: ProjectMatchItem[];
  createdAt: string;
  updatedAt: string;
}

// "내 자료" 탭에서 프로젝트별 최고 매칭을 계산할 때 쓴다 — project_matches가
// application_id로만 묶여 있어서, 회사명을 조인해 평평하게 펴놓은 형태.
export interface ProjectMatchWithCompany {
  company: string;
  matches: ProjectMatchItem[];
}
