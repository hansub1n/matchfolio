// GitHub 연결·로그인에서 돌아온 오류 코드를 화면 안내로 바꾼다.
export type AuthErrorKind = "already_linked" | "failed";

// 이 GitHub가 이미 다른 기록(예전 기기에서 연결한 계정)에 붙어 있으면 연결 대신 그 기록으로 로그인하게 한다.
export function classifyAuthError(code: string | null): AuthErrorKind | null {
  if (!code) return null;
  if (code === "identity_already_exists") return "already_linked";
  return "failed";
}
