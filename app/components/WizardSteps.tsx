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
          const active = i === step;
          return (
            <li key={label} className="relative">
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={active ? "step" : undefined}
                className={[
                  "-mb-px border-b-2 px-3 py-3 text-left text-xs font-semibold tracking-wide transition-colors",
                  active
                    ? "border-brand text-text"
                    : "border-transparent text-text-muted hover:text-text",
                ].join(" ")}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
