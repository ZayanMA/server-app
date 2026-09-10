interface PowerButtonProps {
  action: "wake" | "shutdown";
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}

const COPY = {
  wake: { label: "Wake Server", busyLabel: "Waking…" },
  shutdown: { label: "Shut Down", busyLabel: "Shutting down…" },
};

export function PowerButton({ action, disabled, busy, onClick }: PowerButtonProps) {
  const { label, busyLabel } = COPY[action];
  const isWake = action === "wake";

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`w-full rounded-xl px-6 py-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        isWake
          ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
          : "bg-red-500/90 text-white hover:bg-red-500"
      }`}
    >
      {busy ? busyLabel : label}
    </button>
  );
}
