-- 사용자별 데이터 분리: 모든 사용자 데이터 테이블에 user_id(기본값 auth.uid())를
-- 두고, RLS로 본인 행만 읽고 쓰게 한다. 기존 데이터는 본인 익명 계정으로 옮긴다.
--
-- 실행 전: 아래 '<MY_USER_ID>' 5곳을 본인 익명 계정 id로 바꾼다(안 바꾸면 uuid 형식
-- 오류로 전체가 롤백된다). Supabase SQL 에디터에서 한 번만 실행.
--
-- 실행 후 확인 (전부 0이어야 함):
--   select
--     (select count(*) from applications where user_id is null) as applications,
--     (select count(*) from schedules where user_id is null) as schedules,
--     (select count(*) from interview_prep where user_id is null) as interview_prep,
--     (select count(*) from my_projects where user_id is null) as my_projects,
--     (select count(*) from project_matches where user_id is null) as project_matches;

begin;

-- 1. user_id 컬럼 (applications/my_projects에는 처음부터 nullable로 있었다)
alter table schedules add column user_id uuid;
alter table interview_prep add column user_id uuid;
alter table project_matches add column user_id uuid;

-- 2. 기존 데이터를 본인 계정으로
update applications set user_id = '<MY_USER_ID>' where user_id is null;
update schedules set user_id = '<MY_USER_ID>' where user_id is null;
update interview_prep set user_id = '<MY_USER_ID>' where user_id is null;
update my_projects set user_id = '<MY_USER_ID>' where user_id is null;
update project_matches set user_id = '<MY_USER_ID>' where user_id is null;

-- 3. not null + 기본값(로그인한 사용자) + auth.users FK. 익명 계정을 지우면 데이터도 같이 지워진다.
alter table applications
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint applications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table schedules
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint schedules_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table interview_prep
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint interview_prep_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table my_projects
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint my_projects_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table project_matches
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint project_matches_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

-- RLS가 모든 조회에 user_id 조건을 붙이므로 인덱스를 둔다.
create index applications_user_id_idx on applications (user_id);
create index schedules_user_id_idx on schedules (user_id);
create index interview_prep_user_id_idx on interview_prep (user_id);
create index my_projects_user_id_idx on my_projects (user_id);
create index project_matches_user_id_idx on project_matches (user_id);

-- 4. RLS — select/insert/update/delete 전부 본인 행만.
alter table applications enable row level security;
create policy "본인 데이터만" on applications for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table my_projects enable row level security;
create policy "본인 데이터만" on my_projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 자식 테이블은 자기 user_id에 더해, 쓸 때 부모 지원카드도 본인 것인지 확인한다
-- (남의 지원카드 id로 일정/분석을 붙이는 걸 막기 위해).
alter table schedules enable row level security;
create policy "본인 데이터만" on schedules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

alter table interview_prep enable row level security;
create policy "본인 데이터만" on interview_prep for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

alter table project_matches enable row level security;
create policy "본인 데이터만" on project_matches for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

-- 5. 009에서 남겨둔 백업 테이블은 정책 없이 RLS만 켜서 API로 못 읽게 잠근다(삭제 전까지).
alter table interested_companies_backup enable row level security;

commit;
