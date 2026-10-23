"use client";

// 탭 맨 위 한 줄. 데이터가 0건일 때만 "예시 데이터로 보기"를, 켜져 있으면 "예시 데이터예요 · 끄기"를 보여준다.
export function SampleDataBar({
  available,
  showing,
  onToggle,
  className = "",
}: {
  available: boolean;
  showing: boolean;
  onToggle: (next: boolean) => void;
  // 탭 본문과 같은 폭/여백에 맞추기 위한 컨테이너 클래스.
  className?: string;
}) {
  if (!showing && !available) return null;
  return (
    <div className={`px-6 text-xs text-muted-foreground ${className}`}>
      {showing ? (
        <p>
          예시 데이터예요 ·{" "}
          <button
            type="button"
            onClick={() => onToggle(false)}
            className="underline underline-offset-2 hover:text-foreground"
          >
            끄기
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(true)}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          예시 데이터로 보기
        </button>
      )}
    </div>
  );
}
