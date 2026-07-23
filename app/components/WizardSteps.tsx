"use client";

type WizardStepsProps = {
  labels: readonly string[];
  step: number;
  onStepChange: (step: number) => void;
};

export function WizardSteps({ labels, step, onStepChange }: WizardStepsProps) {
  return (
    <nav aria-label="Upload steps" className="mb-8 border-b border-border">
      <ol className="flex flex-wrap gap-x-1">
        {labels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="relative">
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={active ? "step" : undefined}
                className={[
                  "-mb-px flex items-center gap-2.5 border-b-2 px-3 py-3 text-left transition-colors",
                  active
                    ? "border-brand text-text"
                    : "border-transparent text-text-muted hover:text-text",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-6 w-6 shrink-0 place-items-center border text-2xs font-bold tabular-nums",
                    active
                      ? "border-brand bg-brand text-white"
                      : done
                        ? "border-brand/50 bg-brand-soft text-brand"
                        : "border-border bg-surface text-text",
                  ].join(" ")}
                >
                  {done && !active ? (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={[
                    "text-xs font-semibold tracking-wide",
                    active ? "text-text" : "",
                  ].join(" ")}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
