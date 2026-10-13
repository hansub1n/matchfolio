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
