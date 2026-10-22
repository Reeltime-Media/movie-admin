"use client";

type WizardStepsProps = {
  labels: readonly string[];
  step: number;
  onStepChange: (step: number) => void;
};

export function WizardSteps({ labels, step, onStepChange }: WizardStepsProps) {
  return (
    <nav aria-label="Upload steps" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2">
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
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "border-brand/45 bg-brand-soft text-text"
                    : done
                      ? "border-border bg-surface-elevated text-text-muted hover:border-border-hover hover:text-text"
                      : "border-border bg-surface text-text-disabled hover:border-border-hover hover:text-text-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-5 w-5 place-items-center rounded-full text-2xs font-bold",
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
    </nav>
  );
}
