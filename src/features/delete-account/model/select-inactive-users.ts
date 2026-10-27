// 1년 동안 들어오지 않은 계정 고르기. "마지막으로 들어온 날"은 셋 중 가장 늦은 날:
// - user_activity.last_seen_at: 첫 화면을 열 때 하루 한 번 적는다(020)
// - auth last_sign_in_at: GitHub 로그인 등
// - 계정을 만든 날: 둘 다 없을 때
// last_sign_in_at만 보면 안 된다 — 익명 계정은 세션이 자동으로 갱신될 뿐 다시 로그인하지 않아서, 매일 쓰는
// 사람도 계정을 만든 날에 머물러 1년 뒤 지워진다.
export const INACTIVE_DAYS = 365;

export interface UserForCleanup {
  id: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export function lastActiveAt(user: UserForCleanup, lastSeenAt: string | undefined): number {
  return Math.max(
    ...[user.createdAt, user.lastSignInAt, lastSeenAt].filter((v): v is string => Boolean(v)).map((v) => Date.parse(v))
  );
}

export function selectInactiveUsers(users: UserForCleanup[], lastSeen: Map<string, string>, now: Date): string[] {
  const cutoff = now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;
  return users.filter((user) => lastActiveAt(user, lastSeen.get(user.id)) < cutoff).map((user) => user.id);
}
