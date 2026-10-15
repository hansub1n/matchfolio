export interface InterviewPrepSource {
  title: string;
  url: string;
}

export interface InterviewPrep {
  id: string;
  applicationId: string;
  companyAnalysis: string;
  interviewQuestions: string[];
  sources: InterviewPrepSource[];
  createdAt: string;
  updatedAt: string;
}
