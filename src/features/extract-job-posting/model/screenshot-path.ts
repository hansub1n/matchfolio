// 스크린샷은 {user_id}/ 폴더 아래에 둔다 — Storage RLS가 첫 폴더명이 본인 id인
// 경로만 읽고 쓰게 막는다(012_storage_user_folders.sql).
export function buildScreenshotPath(userId: string, uniqueId: string, fileName: string): string {
  return `${userId}/${uniqueId}-${fileName}`;
}
