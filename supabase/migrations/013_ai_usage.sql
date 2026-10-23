-- AI 기능 하루 사용량 제한. (user_id, kind, date)별로 횟수를 센다.
-- 사용자는 자기 사용량을 읽기만 할 수 있고, 쓰기는 서버(service role)가 아래 함수로만 한다 —
-- anon 키는 공개돼 있어서 사용자에게 쓰기 권한을 주면 자기 카운트를 지울 수 있기 때문.
-- Supabase SQL 에디터에서 한 번만 실행.

begin;

create table ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('extract_job_posting', 'analyze_company', 'match_projects')),
  date date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, kind, date)
);

alter table ai_usage enable row level security;
create policy "본인 사용량 읽기" on ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- 한도 안이면 1 올리고 true, 이미 한도면 그대로 두고 false. 확인과 증가를 한 문장으로
-- 해서 동시에 여러 요청이 와도 한도를 넘지 않는다.
create function consume_ai_usage(p_user_id uuid, p_kind text, p_date date, p_limit integer)
returns boolean
language sql
set search_path = ''
as $$
  with upserted as (
    insert into public.ai_usage (user_id, kind, date, count)
    values (p_user_id, p_kind, p_date, 1)
    on conflict (user_id, kind, date)
    do update set count = public.ai_usage.count + 1
    where public.ai_usage.count < p_limit
    returning 1
  )
  select exists (select 1 from upserted);
$$;

-- AI 호출이 실패하면 차감한 1회를 돌려준다.
create function refund_ai_usage(p_user_id uuid, p_kind text, p_date date)
returns void
language sql
set search_path = ''
as $$
  update public.ai_usage set count = count - 1
  where user_id = p_user_id and kind = p_kind and date = p_date and count > 0;
$$;

revoke execute on function public.consume_ai_usage(uuid, text, date, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text, date, integer) to service_role;
grant execute on function public.refund_ai_usage(uuid, text, date) to service_role;

commit;
