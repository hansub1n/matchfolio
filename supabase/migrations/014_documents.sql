-- "내 자료" 탭: 이력서(1개)와 자소서(여러 개, 대표 1개)를 저장하는 documents 테이블.
-- 공고 상세의 "공고 매칭"이 이 자료로 자소서 첨삭·이력서 강조점·프로젝트 매칭을 만들고,
-- 지원카드의 제출 기록은 자소서 본문을 따로 붙여넣지 않고 "어떤 자소서로 냈는지"만 고른다.
-- Supabase SQL 에디터에서 한 번만 실행. 전체가 한 트랜잭션이라 중간에 실패하면 아무것도 바뀌지 않는다.

begin;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('resume', 'cover_letter')),
  title text not null,
  content text not null,
  -- 대표 자소서 — 공고 매칭이 제출 기록에 고른 자소서가 없을 때 이걸 쓴다.
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이력서는 한 사람당 1개, 대표 자소서도 1개.
create unique index documents_one_resume_per_user on documents (user_id) where kind = 'resume';
create unique index documents_one_primary_cover_letter on documents (user_id)
  where kind = 'cover_letter' and is_primary;
create index documents_user_id_idx on documents (user_id);

alter table documents enable row level security;
create policy "본인 데이터만" on documents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 제출 기록: 자소서 본문(cover_letter) 대신 어떤 자소서로 냈는지를 가리킨다.
-- 지금까지 저장된 자소서 본문은 없어서(확인함) 옮기지 않고 컬럼을 지운다.
alter table applications
  add column submitted_cover_letter_id uuid references documents (id) on delete set null,
  drop column cover_letter;

-- 공고 매칭 결과에 자소서 첨삭·이력서 강조점을 함께 캐싱한다(jsonb, 구버전 행은 null).
alter table project_matches add column review jsonb;

commit;
