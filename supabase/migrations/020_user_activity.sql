-- 마지막으로 들어온 날 — 1년 동안 안 들어온 계정을 자동으로 지우는 기준(개인정보처리방침 "보관 기간과 삭제").
-- auth.users.last_sign_in_at만으로는 안 된다: 익명 계정은 만들 때 한 번 로그인하고 그 뒤로는 세션이 자동으로
-- 갱신될 뿐이라, 매일 쓰는 사람도 last_sign_in_at이 계정을 만든 날에 머문다. 그래서 첫 화면을 열 때 하루 한 번
-- 여기 적고, 정리할 때는 둘 중 늦은 날을 본다.
create table user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

-- 사용자는 직접 읽거나 쓰지 않는다(정책 없음) — 아래 함수로만 자기 줄을 갱신하고, 정리는 service role이 읽는다.
alter table user_activity enable row level security;

-- 하루에 한 번만 실제로 쓴다(이미 오늘 적었으면 아무것도 안 함).
create function touch_user_activity() returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_activity (user_id, last_seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (user_id) do update set last_seen_at = now()
  where public.user_activity.last_seen_at < now() - interval '1 day';
$$;

revoke execute on function public.touch_user_activity() from public, anon;
grant execute on function public.touch_user_activity() to authenticated;
