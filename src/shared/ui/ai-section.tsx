import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "cn";

// 상세 모달 안의 AI 기능(공고 매칭/기업분석)이 공유하는 패널 틀. 상태(대기/
// 로딩/결과/에러)에 따른 본문은 호출하는 쪽이 children으로 채우고, 여기는
// 제목 줄(스파클 아이콘 + 제목 + 선택적 "다시 ~" 버튼)과 배경만 맡는다.
export function AiSection({
  title,
  headerAction,
  help,
  variant = "muted",
  children,
}: {
  title: string;
  headerAction?: ReactNode;
  // 제목 옆 "?" 버튼 자리.
  help?: ReactNode;
  // idle/loading/error는 회색(muted) 배경, 결과가 있으면 흰 배경+테두리(card)로
  // 구분한다 — 결과가 나왔다는 걸 배경만으로도 알아볼 수 있게.
  variant?: "muted" | "card";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3.5",
        // 로딩→결과로 바뀌어도 박스 크기가 그대로이도록 테두리 두께는 항상 같게 두고 색만 바꾼다.
        variant === "card" ? "border bg-card" : "border border-transparent bg-muted"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          <p className="text-sm font-medium">{title}</p>
          <AiBadge />
          {help}
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

// 대기/에러 상태의 주 액션 버튼. 검정(primary) 버튼은 모달 헤더의 "지원하기"
// 하나로 한정하기로 해서, AI 섹션 버튼은 전부 이 흰 버튼 스타일을 쓴다.
export function AiSectionButton({
  icon = true,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs max-sm:px-3.5 max-sm:py-2 max-sm:text-[13px] text-foreground hover:bg-accent",
        className
      )}
      {...props}
    >
      {icon && <Sparkles className="size-[13px]" />}
      {children}
    </button>
  );
}

export function AiSectionSkeleton() {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="h-2 w-[90%] rounded bg-border" />
      <div className="h-2 w-[70%] rounded bg-border" />
      <div className="h-2 w-[80%] rounded bg-border" />
    </div>
  );
}

// AI가 만든 결과가 나오는 영역 제목 옆의 작은 "AI" 표시. 결과마다 맨 아래에 안내 문장을 반복해 붙이면
// 산만해서, 표시만 두고 문구는 마우스를 올리거나 포커스했을 때 보여준다.
const AI_NOTICE = "AI가 만든 내용이라 사실과 다를 수 있어요";

export function AiBadge() {
  return (
    <span
      tabIndex={0}
      title={AI_NOTICE}
      aria-label={AI_NOTICE}
      className="inline-flex h-4 shrink-0 cursor-default items-center rounded px-1 text-[10px] leading-none font-medium text-muted-foreground ring-1 ring-border outline-none focus-visible:ring-ring"
    >
      AI
    </span>
  );
}
