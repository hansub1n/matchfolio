-- 스크린샷 Storage를 사용자별 폴더로 분리한다. 경로는 {user_id}/{파일명}이고,
-- 첫 폴더명이 본인 id인 파일만 읽기/올리기/지우기를 허용한다. 버킷은 private 그대로.
-- 기존 파일(버킷 루트에 있는 것)은 supabase/scripts/move-screenshots-to-user-folder.mjs로
-- 옮긴다. Supabase SQL 에디터에서 한 번만 실행.

create policy "스크린샷 본인 폴더 읽기" on storage.objects for select to authenticated
  using (
    bucket_id = 'job-posting-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "스크린샷 본인 폴더 올리기" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-posting-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "스크린샷 본인 폴더 지우기" on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-posting-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
