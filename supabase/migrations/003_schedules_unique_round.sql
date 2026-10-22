-- 같은 지원 건에 같은 면접 차수(또는 코딩테스트) 행이 중복으로 쌓이는 걸
-- DB 차원에서 막는다. 앱 쪽 로직(기존 행을 찾아 고치는지 판단)이 예전에
-- "가장 최근 행만 보고 비교"하던 버그로 중복을 만든 적이 있어서, 그 로직을
-- 고친 것과 별개로 DB에도 이 제약을 둔다. coding_test는 round_label이
-- 항상 null이라 NULL도 같은 값으로 취급해야 해서 nulls not distinct를 쓴다
-- (Postgres 15+ 필요 — Supabase는 기본적으로 15 이상).
-- Supabase SQL 에디터에서 한 번만 실행.

alter table schedules
  add constraint schedules_application_stage_round_unique
  unique nulls not distinct (application_id, stage, round_label);
