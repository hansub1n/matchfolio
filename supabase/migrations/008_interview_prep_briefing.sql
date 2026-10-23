-- 자유 섹션(sections) 대신 면접 준비용 고정 구조(briefing: business/recent/
-- reverseQuestions)로 바꾸고, 프로젝트 정보가 필요한 "지원 동기에 쓸 포인트"
-- (motivation)는 프로젝트 기반 질문과 같이 생성해서 따로 저장한다. 기존
-- sections 데이터는 그대로 두고 화면에서 구버전 레이아웃으로 보여준다.
-- Supabase SQL 에디터에서 한 번만 실행.

alter table interview_prep
  add column briefing jsonb,
  add column motivation jsonb;
