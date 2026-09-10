import { Loader2, Power, PowerOff } from "lucide-react";

interface PowerButtonProps {
  action: "wake" | "shutdown";
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}

const COPY = {
  wake: { label: "Wake Server", busyLabel: "Waking…", Icon: Power },
  shutdown: { label: "Shut Down", busyLabel: "Shutting down…", Icon: PowerOff },
};

export function PowerButton({ action, disabled, busy, onClick }: PowerButtonProps) {
  const { label, busyLabel, Icon } = COPY[action];
  const isWake = action === "wake";

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:active:scale-100 ${
        isWake
          ? "bg-gradient-to-b from-sky-400 to-sky-500 text-slate-950 shadow-sky-500/20 hover:from-sky-300 hover:to-sky-400"
          : "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-red-500/20 hover:from-red-400 hover:to-red-500"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {busy ? busyLabel : label}
    </button>
  );
}
