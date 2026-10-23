import { cn } from "cn";

// 빈 상태에서 "데이터가 들어올 자리"를 보여주는 회색 막대/칸. 실제 레이아웃과 같은
// 위치·크기로 그려서, 데이터가 생겼을 때 화면 구조가 바뀌지 않게 한다.
export function PlaceholderBar({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-2.5 rounded-full bg-muted", className)} />;
}

export function PlaceholderBox({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block shrink-0 rounded-md bg-muted", className)} />;
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] text-muted-foreground">{children}</p>;
}
