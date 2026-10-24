import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

export function DetailGroup({
  title,
  open,
  onToggle,
  help,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  // 제목 옆 "?" 버튼 자리(사용법 해당 챕터 열기).
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-1 text-sm font-medium hover:text-foreground"
        >
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
          {title}
        </button>
        {help}
      </div>
      {open && <div className="flex flex-col gap-5">{children}</div>}
    </section>
  );
}
