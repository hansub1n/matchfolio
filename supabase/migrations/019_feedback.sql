-- 사용자 의견("의견 보내기"). 보내기만 하고 아무도 읽지 못한다 — 확인은 Supabase 대시보드에서만.
-- 공고 추출 실패 화면의 "알려주기"도 같은 표에 page = 'extract'로 들어온다(캡처 이미지는 받지 않음).
create table feedback (
  id uuid primary key default gen_random_uuid(),
  -- 계정이 지워져도(익명 계정 정리 등) 의견은 남긴다.
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('inconvenient', 'idea', 'good')),
  message text not null check (char_length(message) between 1 and 2000),
  contact text check (contact is null or char_length(contact) <= 200),
  page text check (page is null or char_length(page) <= 200),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index feedback_user_created_idx on feedback (user_id, created_at);

alter table feedback enable row level security;

-- 넣기만 본인 것으로. 읽기·고치기·지우기 정책은 두지 않는다(RLS가 켜져 있으면 정책 없는 동작은 전부 막힌다).
create policy "본인 의견 보내기" on feedback for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 한 사용자당 하루(KST) 10건까지. 읽기 정책이 없어 사용자 권한으로는 개수를 셀 수 없으니 security definer로 센다.
create function enforce_feedback_daily_limit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.feedback
    where user_id = new.user_id
      and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
  ) >= 10 then
    raise exception 'feedback_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_feedback_daily_limit() from public, anon, authenticated;

create trigger feedback_daily_limit
  before insert on feedback
  for each row execute function enforce_feedback_daily_limit();
