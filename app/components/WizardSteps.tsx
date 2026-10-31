"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

type WizardStepsProps = {
  labels: readonly string[];
  step: number;
  onStepChange: (step: number) => void;
  /** Optional control rendered before the steps (e.g. icon back button). */
  leading?: ReactNode;
};

export function WizardSteps({ labels, step, onStepChange, leading }: WizardStepsProps) {
  return (
    <nav
      aria-label="Upload steps"
      className="mb-6 flex flex-wrap items-center gap-3"
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {labels.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex items-center gap-1">
              {i > 0 ? <span className="hidden h-px w-5 bg-border sm:block" aria-hidden /> : null}
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={active ? "step" : undefined}
                className={[
                  "inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-surface-elevated",
                  active ? "font-medium text-text" : "text-text-muted hover:text-text",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-5 w-5 place-items-center rounded-full text-xs font-medium tabular-nums",
                    active
                      ? "bg-brand text-on-brand"
                      : done
                        ? "bg-brand-soft text-brand"
                        : "bg-surface-elevated text-text-muted",
                  ].join(" ")}
                >
                  {done ? <Check size={12} strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="w-full text-xs text-text-muted sm:ml-auto sm:w-auto">
        Step {step + 1} of {labels.length}
      </p>
    </nav>
  );
}
