-- 기업분석 결과에 간단한 사실 정보(설립연도/직원 수/투자 단계/매출 등)를
-- 추가한다. questions jsonb 안의 relatedProjectId/noExperience 필드는 컬럼
-- 변경 없이 그대로 들어간다(jsonb라 스키마리스).
-- Supabase SQL 에디터에서 한 번만 실행.

alter table interview_prep add column facts jsonb;
