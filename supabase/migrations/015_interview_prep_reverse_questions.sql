-- 회사 분석과 예상 질문을 따로 만든다: "분석하기"(회사 분석)는 회사 정보만, 면접 준비의
-- "예상 질문 만들기"가 기본 질문·역질문·프로젝트 기반 질문을 만든다. 역질문은 회사 정보(briefing)
-- 안에 들어 있었는데, 이제 질문 쪽에서 만들어서 따로 둔다. 기존 역질문은 옮겨둔다.
-- Supabase SQL 에디터에서 한 번만 실행.

begin;

alter table interview_prep add column reverse_questions jsonb;

update interview_prep
  set reverse_questions = briefing -> 'reverseQuestions'
  where briefing ? 'reverseQuestions';

commit;
