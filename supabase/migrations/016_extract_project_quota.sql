-- 프로젝트 불러오기(README·텍스트 → AI 추출)도 하루 사용량 한도에 넣는다.
-- 지금까지는 이 기능만 한도 없이 Groq를 불러서, 반복 호출하면 비용·분당 토큰을 그대로 잡아먹었다.
-- Supabase SQL 에디터에서 한 번만 실행.

begin;

alter table ai_usage drop constraint ai_usage_kind_check;
alter table ai_usage add constraint ai_usage_kind_check
  check (kind in ('extract_job_posting', 'analyze_company', 'match_projects', 'extract_project'));

commit;
