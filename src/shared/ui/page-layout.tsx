import type { ReactNode } from "react";

// 통계/내 프로젝트/캘린더 공통 틀(보드는 전체 폭이라 예외). 데이터가 있든 없든 같은
// 폭·위치를 쓰고, 제목 줄 높이를 min-h-9로 고정해 오른쪽 버튼 유무로 본문이 밀리지 않게 한다.
export function PageLayout({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h1 className="min-w-0 text-[19px] font-medium tracking-tight sm:text-[22px]">{title}</h1>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      {subtitle && <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>}
      <div className="mt-6 sm:mt-8">{children}</div>
    </div>
  );
}
