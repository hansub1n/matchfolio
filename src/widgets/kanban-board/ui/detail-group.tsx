import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

export function DetailGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-1 self-start text-sm font-medium hover:text-foreground"
      >
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        {title}
      </button>
      {open && <div className="flex flex-col gap-5">{children}</div>}
    </section>
  );
}
