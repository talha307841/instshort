"use client";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => {
        const number = index + 1;
        const isCurrent = number === currentStep;
        const isDone = number < currentStep;

        return (
          <li key={step} className="card flex items-center gap-3 p-3">
            <span
              className={`flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${
                isDone
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                  : isCurrent
                    ? "step-current border-[var(--accent-primary)] text-[var(--accent-primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              {number}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
