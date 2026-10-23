-- 서류 단계 제출 기록 — 지원할 때 어필한 프로젝트(my_projects id)와 낸 자소서.
-- 프로젝트 기반 예상 질문 생성에 쓰이고, submission_updated_at으로 질문을 만든 뒤에
-- 기록이 바뀌었는지 판단한다. Supabase SQL 에디터에서 한 번만 실행.

alter table applications
  add column submitted_project_ids uuid[] not null default '{}',
  add column cover_letter text,
  add column submission_updated_at timestamptz;
