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
