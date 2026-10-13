export interface InterestedCompany {
  id: string;
  company: string;
  position: string | null;
  deadline: string | null;
  jobPostingUrl: string | null;
  screenshotPaths: string[];
  description: string | null;
  memo: string | null;
  techStack: string[];
  createdAt: string;
}
