import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "cn";

// 상세 모달 안의 AI 기능(프로젝트 매칭/기업분석)이 공유하는 패널 틀. 상태(대기/
// 로딩/결과/에러)에 따른 본문은 호출하는 쪽이 children으로 채우고, 여기는
// 제목 줄(스파클 아이콘 + 제목 + 선택적 "다시 ~" 버튼)과 배경만 맡는다.
export function AiSection({
  title,
  headerAction,
  children,
}: {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          <p className="text-sm font-medium">{title}</p>
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
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent",
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
