-- status/result/interview_round를 stage/outcome + schedules 테이블로 분리.
-- Supabase SQL 에디터에서 한 번만 실행. (dev 중 테스트하며 넣은 깨진 조합 3건 삭제 포함)

-- 1. 테스트하면서 수동으로 넣은 더미 데이터 정리
delete from applications where id in (
  '0e9069c5-f9f2-40fd-886d-188d26353c3c', -- (주)앳진
  'a1511496-b7fb-488f-adb5-21006074e2c4', -- 뮤자인(MUSIGN)
  '57be7aab-2d86-4672-9f12-6215085fa8cb'  -- 넷지헬스케어(주) 중복 건
);

-- 2. 신규 컬럼 추가
alter table applications
  add column stage text,
  add column outcome text not null default 'in_progress';

-- 3. 기존 status → stage 변환
update applications set stage = case
  when status = 'applied' then 'document'
  when status = 'document_passed' then 'coding_test' -- 서류합격 상태였던 카드는 코딩테스트로
  when status in ('coding_test', 'interview') then status
  when status = 'result' then 'interview' -- 탈락 단계가 기록된 적이 없어서 기본값. 실제와 다르면 수동 수정.
end;

-- 4. 기존 result → outcome 변환 (status='result'였던 카드만)
update applications set outcome = coalesce(result, 'in_progress')
where status = 'result';

-- 5. schedules 테이블 생성
create table schedules (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  stage text not null check (stage in ('coding_test', 'interview')),
  round_label text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6. 기존 interview_round → schedules 이관
insert into schedules (application_id, stage, round_label, scheduled_at)
select id, 'interview', interview_round, null
from applications
where interview_round is not null;

-- 7. 옛 컬럼 제거 + 제약 추가
alter table applications
  alter column stage set not null,
  alter column stage set default 'document',
  add constraint applications_stage_check check (stage in ('document', 'coding_test', 'interview')),
  add constraint applications_outcome_check check (outcome in ('in_progress', 'passed', 'failed')),
  drop column status,
  drop column result,
  drop column interview_round;
