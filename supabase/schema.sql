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
  created_at timestamptz not null default now()
);

create table interview_prep (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade unique,
  company_analysis text not null,
  interview_questions text[] not null default '{}',
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
