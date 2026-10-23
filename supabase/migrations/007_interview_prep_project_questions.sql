-- 예상 질문을 "기본 질문"(questions, 공고/회사 정보만으로 생성)과 "내 프로젝트
-- 기반 질문"(project_questions, 내 프로젝트가 있을 때만)으로 분리해서 따로
-- 저장한다. 프로젝트 기반 질문은 프로젝트가 바뀌어도 자동으로 다시 만들지
-- 않고 "다시 만들기"로만 갱신하므로, 언제 마지막으로 만들었는지(updated_at)를
-- 따로 들고 있어야 새 프로젝트가 반영 안 됐는지 판단할 수 있다.
-- Supabase SQL 에디터에서 한 번만 실행.

alter table interview_prep
  add column project_questions jsonb,
  add column project_questions_updated_at timestamptz;
