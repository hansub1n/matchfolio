-- 회사 분석용 웹 검색(Tavily) 결과를 사용자끼리 공유하는 캐시.
-- Tavily 무료 한도(월 1,000 크레딧)가 회사 분석 한 번에 검색 5번씩 들어가 가장 먼저 바닥나서,
-- 같은 검색어는 며칠 동안 저장된 결과를 다시 쓴다. 검색 결과는 회사명·직무로만 나오는 공개 정보라
-- 사용자 데이터가 아니다 — AI 분석(각자의 공고 내용이 들어감)은 공유하지 않고 사람마다 따로 만든다.
-- 읽기·쓰기는 서버(service role)만 한다(정책 없이 RLS만 켜서 anon·로그인 사용자는 접근 불가).
-- Supabase SQL 에디터에서 한 번만 실행.

begin;

create table search_cache (
  -- 검색어 + 옵션(채용사이트 한정·뉴스)을 정규화한 문자열.
  key text primary key,
  results jsonb not null,
  created_at timestamptz not null default now()
);

alter table search_cache enable row level security;

commit;
