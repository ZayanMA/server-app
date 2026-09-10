import { Check, Loader2 } from "lucide-react";
import type { PowerPhase } from "../api";

const STEPS: Array<{ key: PowerPhase; label: string }> = [
  { key: "offline", label: "Waiting for the server to respond" },
  { key: "booting", label: "Booting — replying to ping" },
  { key: "starting", label: "Starting up — SSH coming online" },
  { key: "online", label: "Online" },
];

interface BootProgressProps {
  phase: PowerPhase;
}

export function BootProgress({ phase }: BootProgressProps) {
  const current = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="animate-fade-in rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                    : active
                      ? "border-sky-400 text-sky-400"
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
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
