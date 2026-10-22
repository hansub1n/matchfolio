export interface ProjectMatchItem {
  projectName: string;
  fitScore: number;
  reason: string;
  highlightPoints: string[];
}

export interface ProjectMatches {
  id: string;
  interestedCompanyId: string;
  matches: ProjectMatchItem[];
  createdAt: string;
  updatedAt: string;
}

// "내 프로젝트" 탭에서 프로젝트별 최고 매칭을 계산할 때 쓴다 — project_matches가
// interested_company_id로만 묶여 있어서, 회사명을 조인해 평평하게 펴놓은 형태.
export interface ProjectMatchWithCompany {
  company: string;
  matches: ProjectMatchItem[];
}
