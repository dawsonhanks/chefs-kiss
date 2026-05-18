import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimer, parseStepTimer } from "../utils/helpers";

export default function CookMode({ recipe, onClose, onLogCooked }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(() => new Set());
  const [timerSecs, setTimerSecs] = useState(null);
  const [timerLeft, setTimerLeft] = useState(null);
  const wakeLockRef = useRef(null);

  const steps = recipe.steps || [];
  const currentStep = steps[stepIndex] || "";
  const suggestedSecs = parseStepTimer(currentStep);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* unsupported or denied */
    }
  }, []);

  useEffect(() => {
    requestWakeLock();
    return () => {
      wakeLockRef.current?.release?.();
    };
  }, [requestWakeLock]);

  useEffect(() => {
    if (timerLeft == null || timerLeft <= 0) return;
    const id = setInterval(() => {
      setTimerLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerLeft]);

  const toggleComplete = (i) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const startTimer = (secs) => {
    setTimerSecs(secs);
    setTimerLeft(secs);
  };

  const allDone = completed.size === steps.length && steps.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-kitchen-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-kitchen-border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-semibold text-[var(--color-kitchen-amber)]">
            {recipe.name}
          </h2>
          <p className="text-xs text-[var(--color-kitchen-muted)]">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
        >
          Exit
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-lg leading-relaxed text-[var(--color-kitchen-cream)]">
          {currentStep}
        </p>

        {(suggestedSecs || timerLeft != null) && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {timerLeft != null && timerLeft > 0 ? (
              <span className="font-serif text-4xl font-bold text-[var(--color-kitchen-amber)]">
                {formatTimer(timerLeft)}
              </span>
            ) : timerLeft === 0 ? (
              <span className="rounded-lg bg-[var(--color-kitchen-success)]/20 px-4 py-2 text-sm font-semibold text-[var(--color-kitchen-success)]">
                Timer done!
              </span>
            ) : null}
            {suggestedSecs && timerLeft == null && (
              <button
                type="button"
                onClick={() => startTimer(suggestedSecs)}
                className="rounded-lg bg-[var(--color-kitchen-amber)] px-4 py-2 text-sm font-semibold text-[#0f0f0f]"
              >
                Start {formatTimer(suggestedSecs)} timer
              </button>
            )}
            {timerLeft != null && (
              <button
                type="button"
                onClick={() => {
                  setTimerLeft(null);
                  setTimerSecs(null);
                }}
                className="text-xs text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
              >
                Clear timer
              </button>
            )}
          </div>
        )}

        <label className="mt-8 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={completed.has(stepIndex)}
            onChange={() => toggleComplete(stepIndex)}
            className="h-5 w-5 accent-[var(--color-kitchen-amber)]"
          />
          <span className="text-sm text-[var(--color-kitchen-muted)]">
            Mark step complete
          </span>
        </label>

        <ol className="mt-8 space-y-2 border-t border-[var(--color-kitchen-border)] pt-6">
          {steps.map((step, i) => (
            <li
              key={i}
              className={`flex gap-2 text-sm ${
                i === stepIndex
                  ? "text-[var(--color-kitchen-amber)]"
                  : completed.has(i)
                    ? "text-[var(--color-kitchen-muted)] line-through"
                    : "text-[var(--color-kitchen-muted)]"
              }`}
            >
              <span className="shrink-0 font-medium">{i + 1}.</span>
              <button
                type="button"
                onClick={() => setStepIndex(i)}
                className="text-left hover:text-[var(--color-kitchen-cream)]"
              >
                {step}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <footer className="flex gap-2 border-t border-[var(--color-kitchen-border)] p-4">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => i - 1)}
          className="flex-1 rounded-lg border border-[var(--color-kitchen-border)] py-3 text-sm font-medium disabled:opacity-40"
        >
          Previous
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i + 1)}
            className="flex-1 rounded-lg bg-[var(--color-kitchen-amber)] py-3 text-sm font-semibold text-[#0f0f0f]"
          >
            Next Step
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onLogCooked?.(recipe);
              onClose();
            }}
            className="flex-1 rounded-lg bg-[var(--color-kitchen-success)] py-3 text-sm font-semibold text-[#0f0f0f]"
          >
            {allDone ? "Finish & Log" : "Finish Cooking"}
          </button>
        )}
      </footer>
    </div>
  );
}
