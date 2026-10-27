-- 안 쓰는 것 정리.
-- - interested_companies_backup: 009에서 관심기업을 applications로 합칠 때 남겨둔 백업. 통합 뒤 문제없이 써서 지운다.
-- - interview_prep.motivation: 지원 동기 포인트를 공고 매칭(project_matches.review)으로 옮긴 뒤 아무도 읽지 않는 컬럼.
drop table if exists interested_companies_backup;
alter table interview_prep drop column if exists motivation;
