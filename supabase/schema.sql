-- "내 자료"의 이력서(1개)·자소서(여러 개, 대표 1개). 014.
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('resume', 'cover_letter')),
  title text not null,
  content text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index documents_one_resume_per_user on documents (user_id) where kind = 'resume';
create unique index documents_one_primary_cover_letter on documents (user_id)
  where kind = 'cover_letter' and is_primary;
create index documents_user_id_idx on documents (user_id);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null,
  -- 관심 단계에서는 직무가 정해지지 않았을 수 있다.
  position text,
  -- stage: 지금 어떤 전형을 진행 중인지. outcome: 그 전형의 결과.
  -- interested는 아직 지원하지 않은 관심 공고(구 interested_companies, 009에서
  -- 통합) — 통계/잔디의 "지원" 집계에서 빠지고, 마감일은 이 단계에서만 의미가 있다.
  -- 둘을 분리해둬서 "면접에서 떨어졌다"(stage=interview, outcome=failed)처럼
  -- 어느 단계에서 탈락했는지가 남는다. 서류합격은 컬럼이 아니라 document에서
  -- coding_test/interview로 넘어가는 이동 그 자체라 별도 값이 없다.
  stage text not null default 'document'
    check (stage in ('interested', 'document', 'coding_test', 'interview')),
  outcome text not null default 'in_progress'
    check (outcome in ('in_progress', 'passed', 'failed')),
  applied_at date,
  deadline date,
  job_posting_url text,
  screenshot_paths text[] not null default '{}',
  description text,
  memo text,
  tech_stack text[] not null default '{}',
  -- 제출 기록: 지원할 때 어필한 프로젝트(my_projects id, FK 없음 — 삭제된 id는 읽을 때
  -- 무시)와 어떤 자소서로 냈는지(documents). 프로젝트 기반 예상 질문 생성에 쓰이고,
  -- submission_updated_at은 질문 생성 이후 기록이 바뀌었는지 판단하는 데 쓴다.
  submitted_project_ids uuid[] not null default '{}',
  submitted_cover_letter_id uuid references documents (id) on delete set null,
  submission_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  stage text not null check (stage in ('coding_test', 'interview')),
  round_label text, -- '1차', '2차', '임원면접' 등. 코딩테스트는 보통 비워둠.
  scheduled_at timestamptz, -- null이면 일정 미정.
  created_at timestamptz not null default now(),
  -- 같은 지원 건에 같은 차수(혹은 코딩테스트) 행이 중복 insert되는 걸 DB
  -- 차원에서도 막는다. round_label이 null인 coding_test끼리도 중복으로
  -- 치도록 nulls not distinct를 쓴다(Postgres 15+).
  constraint schedules_application_stage_round_unique
    unique nulls not distinct (application_id, stage, round_label)
);

create table interview_prep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade unique,
  -- 구조화 이전 레코드용. 새 분석부터는 채우지 않는다(아래 summary/sections/
  -- questions/confidence를 쓴다) — 둘 다 nullable인 건 둘 중 하나만 채워지기 때문.
  company_analysis text,
  interview_questions text[],
  summary text,
  facts jsonb,
  -- 면접 준비용 고정 구조 { business, recent, reverseQuestions }.
  briefing jsonb,
  -- briefing 이전의 자유 섹션. 새 분석부터는 채우지 않는다.
  sections jsonb,
  -- "기본 질문" — 공고/회사 정보만으로 생성, "다시 분석"에만 갱신된다.
  questions jsonb,
  confidence text check (confidence in ('high', 'low')),
  -- "내 프로젝트 기반 질문" — 프로젝트가 1개 이상일 때만 별도로 생성되고,
  -- 그룹 자체의 "다시 만들기"로만 갱신된다. updated_at을 따로 둬서 새
  -- 프로젝트가 반영 안 됐는지(project의 created_at과 비교) 판단한다.
  project_questions jsonb,
  -- "지원 동기에 쓸 포인트" — 프로젝트 정보가 필요해서 project_questions와
  -- 같이 생성/갱신된다.
  motivation jsonb,
  project_questions_updated_at timestamptz,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table my_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text,
  tech_stack text[] not null default '{}',
  highlights text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table project_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade unique,
  matches jsonb not null default '[]',
  -- 전체 추천 한 줄. matches 각 항목의 evidence/gaps/pitch/projectId는 jsonb라
  -- 컬럼 없이도 들어간다.
  recommendation text,
  -- 공고 매칭의 자소서 첨삭·이력서 강조점(014).
  review jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자별 데이터 분리(011). 익명 로그인 세션의 auth.uid()로 본인 행만 읽고 쓴다.
-- 자식 테이블은 쓸 때 부모 지원카드도 본인 것인지 확인한다.
create index applications_user_id_idx on applications (user_id);
create index schedules_user_id_idx on schedules (user_id);
create index interview_prep_user_id_idx on interview_prep (user_id);
create index my_projects_user_id_idx on my_projects (user_id);
create index project_matches_user_id_idx on project_matches (user_id);

alter table applications enable row level security;
create policy "본인 데이터만" on applications for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table my_projects enable row level security;
create policy "본인 데이터만" on my_projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table schedules enable row level security;
create policy "본인 데이터만" on schedules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

alter table interview_prep enable row level security;
create policy "본인 데이터만" on interview_prep for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

alter table project_matches enable row level security;
create policy "본인 데이터만" on project_matches for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

-- 스크린샷 Storage(012): 경로는 {user_id}/{파일명}, 첫 폴더가 본인 id인 파일만 접근. 버킷은 private.
create policy "스크린샷 본인 폴더 읽기" on storage.objects for select to authenticated
  using (bucket_id = 'job-posting-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "스크린샷 본인 폴더 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-posting-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "스크린샷 본인 폴더 지우기" on storage.objects for delete to authenticated
  using (bucket_id = 'job-posting-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- AI 하루 사용량(013). 사용자는 읽기만, 쓰기는 서버(service role)가 아래 함수로만.
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

-- 한도 안이면 +1 하고 true(확인과 증가를 한 문장으로 — 동시 요청에도 한도를 넘지 않음).
create function consume_ai_usage(p_user_id uuid, p_kind text, p_date date, p_limit integer)
returns boolean language sql set search_path = '' as $$
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

-- AI 호출 실패 시 차감한 1회 환불.
create function refund_ai_usage(p_user_id uuid, p_kind text, p_date date)
returns void language sql set search_path = '' as $$
  update public.ai_usage set count = count - 1
  where user_id = p_user_id and kind = p_kind and date = p_date and count > 0;
$$;

revoke execute on function public.consume_ai_usage(uuid, text, date, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text, date, integer) to service_role;
grant execute on function public.refund_ai_usage(uuid, text, date) to service_role;

alter table documents enable row level security;
create policy "본인 데이터만" on documents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
