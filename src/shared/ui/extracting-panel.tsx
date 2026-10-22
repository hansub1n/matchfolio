// 스크린샷 업로드 직후 AI 추출이 끝날 때까지 보여주는 자리. 드롭 영역과 같은
// 높이(h-44)를 써서 전환이 튀지 않게 한다.
export function ExtractingPanel({
  previewUrl,
  label,
}: {
  previewUrl: string | null;
  label: string;
}) {
  return (
    <div className="flex h-44 items-center gap-3 rounded-xl border border-dashed bg-muted/50 px-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-md object-cover object-top"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
      )}
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
