-- 프로젝트 매칭 결과에 전체 추천 한 줄(recommendation)을 추가한다. matches
-- jsonb 안의 각 항목에는 evidence/gaps/pitch/projectId가 추가되지만 jsonb라
-- 컬럼 변경이 따로 필요 없다 — recommendation만 새 컬럼으로 추가한다. 구버전
-- 캐시 행은 이 컬럼이 null인 채로 남고, 프런트에서 null이면 그냥 숨긴다.
-- Supabase SQL 에디터에서 한 번만 실행.

alter table project_matches add column recommendation text;
