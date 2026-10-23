-- 기업분석 결과를 구조화된 형태(summary/sections/questions/confidence)로 저장하게
-- 확장한다. 기존 자유 텍스트 컬럼(company_analysis/interview_questions)은 구버전
-- 레코드를 깨뜨리지 않으려고 남겨두고 nullable로 바꾼다 — 새 분석부터는 새 컬럼만
-- 채우고 구버전 레코드는 프런트에서 그대로 읽어 보여준다.
-- Supabase SQL 에디터에서 한 번만 실행.

alter table interview_prep
  alter column company_analysis drop not null,
  alter column interview_questions drop not null,
  add column summary text,
  add column sections jsonb,
  add column questions jsonb,
  add column confidence text check (confidence in ('high', 'low'));
