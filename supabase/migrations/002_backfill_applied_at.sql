-- applied_at이 null인 기존 카드를 created_at의 KST 날짜로 채운다.
-- UTC로 저장된 created_at을 'Asia/Seoul'로 변환한 뒤 날짜만 취한다.
update applications
set applied_at = (created_at at time zone 'Asia/Seoul')::date
where applied_at is null;
