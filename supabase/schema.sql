create table interested_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company text not null,
  position text,
  deadline date,
  job_posting_url text,
  screenshot_paths text[] not null default '{}',
  description text,
  memo text,
  tech_stack text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company text not null,
  position text not null,
  -- stage: 지금 어떤 전형을 진행 중인지. outcome: 그 전형의 결과.
  -- 둘을 분리해둬서 "면접에서 떨어졌다"(stage=interview, outcome=failed)처럼
  -- 어느 단계에서 탈락했는지가 남는다. 서류합격은 컬럼이 아니라 document에서
  -- coding_test/interview로 넘어가는 이동 그 자체라 별도 값이 없다.
  stage text not null default 'document'
    check (stage in ('document', 'coding_test', 'interview')),
  outcome text not null default 'in_progress'
    check (outcome in ('in_progress', 'passed', 'failed')),
  applied_at date,
  deadline date,
  job_posting_url text,
  screenshot_paths text[] not null default '{}',
  description text,
  memo text,
  tech_stack text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
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
  user_id uuid,
  name text not null,
  description text,
  tech_stack text[] not null default '{}',
  highlights text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table project_matches (
  id uuid primary key default gen_random_uuid(),
  interested_company_id uuid not null references interested_companies(id) on delete cascade unique,
  matches jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
