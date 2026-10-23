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

export interface ProjectMatches {
  id: string;
  applicationId: string;
  recommendation: string | null;
  matches: ProjectMatchItem[];
  createdAt: string;
  updatedAt: string;
}

// "내 프로젝트" 탭에서 프로젝트별 최고 매칭을 계산할 때 쓴다 — project_matches가
// application_id로만 묶여 있어서, 회사명을 조인해 평평하게 펴놓은 형태.
export interface ProjectMatchWithCompany {
  company: string;
  matches: ProjectMatchItem[];
}
