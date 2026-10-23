-- 관심기업(interested_companies)을 지원카드(applications)로 통합한다. 관심
-- 단계는 stage='interested'로 표현하고, 같은 id를 유지해서 프로젝트 매칭 결과를
-- 그대로 연결한다. 원본 테이블은 지우지 않고 interested_companies_backup으로
-- 이름만 바꿔둔다(확인 후 수동 삭제).
-- Supabase SQL 에디터에서 한 번만 실행. 전체가 한 트랜잭션이라 중간에 실패하면
-- 아무것도 바뀌지 않는다.
--
-- 실행 전 확인:
--   select
--     (select count(*) from applications) as applications,
--     (select count(*) from interested_companies) as interested_companies,
--     (select count(*) from project_matches) as project_matches;
--
-- 실행 후 확인 (applications = 전 applications + 전 interested_companies,
-- interested = backup, project_matches 개수 그대로, 나머지 두 값은 0):
--   select
--     (select count(*) from applications) as applications,
--     (select count(*) from applications where stage = 'interested') as interested,
--     (select count(*) from interested_companies_backup) as backup,
--     (select count(*) from project_matches) as project_matches,
--     (select count(*) from project_matches where application_id is null) as matches_without_application,
--     (select count(*) from interested_companies_backup b
--        where not exists (select 1 from applications a where a.id = b.id)) as not_moved;

begin;

-- 1. 관심 단계 추가 + 관심 단계에서는 없을 수 있는 직무/지원일을 nullable로
alter table applications drop constraint applications_stage_check;
alter table applications add constraint applications_stage_check
  check (stage in ('interested', 'document', 'coding_test', 'interview'));
alter table applications alter column position drop not null;
alter table applications alter column applied_at drop not null;

-- 2. 관심기업 행을 같은 id로 이동 (updated_at 컬럼이 원본엔 없어서 created_at으로)
insert into applications (
  id, user_id, company, position, stage, outcome, applied_at, deadline,
  job_posting_url, screenshot_paths, description, memo, tech_stack, created_at, updated_at
)
select
  id, user_id, company, position, 'interested', 'in_progress', null, deadline,
  job_posting_url, screenshot_paths, description, memo, tech_stack, created_at, created_at
from interested_companies;

-- 3. 프로젝트 매칭을 applications 기준으로 (id가 같으므로 값 그대로 복사)
alter table project_matches
  add column application_id uuid references applications(id) on delete cascade;
update project_matches set application_id = interested_company_id;
alter table project_matches alter column application_id set not null;
alter table project_matches
  add constraint project_matches_application_id_key unique (application_id);
alter table project_matches drop column interested_company_id;

-- 4. 원본은 백업으로 이름만 변경
alter table interested_companies rename to interested_companies_backup;

commit;
