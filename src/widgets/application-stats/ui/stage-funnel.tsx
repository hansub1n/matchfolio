import { cn } from "cn";

import type { FunnelStep } from "../model/compute-stats";

function FinalColumnBar({ step, total }: { step: FunnelStep; total: number }) {
  const passedPercent = step.percent;
  const pendingPercent = total > 0 ? (step.pending / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-highlight" style={{ width: `${passedPercent}%` }} />
        {step.pending > 0 && (
          <div
            className="h-full"
            style={{
              width: `${pendingPercent}%`,
              backgroundImage:
                "repeating-linear-gradient(-45deg, var(--highlight) 0 3px, transparent 3px 6px)",
            }}
          />
        )}
      </div>
      {(step.failures.length > 0 || step.pending > 0) && (
        <div className="flex flex-col gap-0.5">
          {step.failures.map((f) => (
            <p key={f.label} className="text-[11px] text-destructive">
              {f.label} {f.count}
            </p>
          ))}
          {step.pending > 0 && step.pendingLabel && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-[2px] bg-highlight" />
              {step.pendingLabel} {step.pending}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function StageFunnel({ steps, total }: { steps: FunnelStep[]; total: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
      {steps.map((step, i) => {
        const isFinal = i === steps.length - 1;
        return (
          <div key={step.label} className="flex flex-col gap-1">
            <span
              className={cn(
                "text-[30px] font-medium tabular-nums",
                isFinal && step.count === 0 && "text-muted-foreground"
              )}
            >
              {step.count}
            </span>
            <span className="text-xs text-muted-foreground">{step.label}</span>
            {isFinal ? (
              <FinalColumnBar step={step} total={total} />
            ) : (
              <div className="h-1 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${step.percent}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
