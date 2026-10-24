// "내 자료"의 이력서(1개)·자소서(여러 개, 대표 1개).
export type DocumentKind = "resume" | "cover_letter";

export interface UserDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  content: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}
