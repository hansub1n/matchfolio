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
  status text not null default 'applied'
    check (status in ('applied', 'document_passed', 'coding_test', 'interview', 'result')),
  interview_round text,
  result text check (result in ('passed', 'failed')),
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
