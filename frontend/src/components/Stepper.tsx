import { Check, type LucideIcon, Loader2 } from "lucide-react";

type Accent = "sky" | "red";

const ACCENT_CLASSES: Record<Accent, { border: string; text: string }> = {
  sky: { border: "border-sky-400", text: "text-sky-400" },
  red: { border: "border-red-400", text: "text-red-400" },
};

interface StepperProps {
  icon: LucideIcon;
  title: string;
  accent: Accent;
  steps: string[];
  /** Index of the step currently in progress; earlier steps are shown done. */
  currentIndex: number;
}

export function Stepper({ icon: Icon, title, accent, steps, currentIndex }: StepperProps) {
  const { border, text } = ACCENT_CLASSES[accent];

  return (
    <div className="animate-fade-in rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2 px-1">
        <Icon className={`h-4 w-4 ${text}`} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      </div>
      {steps.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === steps.length - 1;

        return (
          <div key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                    : active
                      ? `${border} ${text}`
                      : "border-white/10 text-transparent"
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 ${done ? "bg-emerald-400/40" : "bg-white/10"}`}
                  style={{ minHeight: "1.5rem" }}
                />
              )}
            </div>
            <p
              className={`pb-6 text-sm ${
                done ? "text-slate-400" : active ? "font-medium text-slate-100" : "text-slate-600"
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
