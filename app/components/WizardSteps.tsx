"use client";

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
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {labels.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 ? (
                <span
                  className={[
                    "hidden h-px w-6 sm:block",
                    done || active ? "bg-brand/50" : "bg-border",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={active ? "step" : undefined}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-brand/45 bg-brand-soft text-text"
                    : done
                      ? "border-border bg-surface-elevated text-text-muted hover:border-border-hover hover:text-text"
                      : "border-border bg-surface text-text-disabled hover:border-border-hover hover:text-text-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-6 w-6 place-items-center rounded-full text-2xs font-bold",
                    active
                      ? "bg-brand text-white"
                      : done
                        ? "bg-success/20 text-success"
                        : "bg-surface-elevated text-text-disabled",
                  ].join(" ")}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="w-full text-2xs text-text-muted sm:ml-auto sm:w-auto">
        Step {step + 1} of {labels.length}
      </p>
    </nav>
  );
}
