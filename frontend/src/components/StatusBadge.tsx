import { Loader2, Power, PowerOff } from "lucide-react";
import type { ReactNode } from "react";
import type { PowerPhase } from "../api";

interface StatusBadgeProps {
  phase: PowerPhase | null;
  shuttingDown: boolean;
}

function Badge({
  tone,
  icon,
  label,
}: {
  tone: "emerald" | "sky" | "red" | "slate";
  icon: ReactNode;
  label: string;
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : tone === "sky"
        ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
        : tone === "red"
          ? "border-red-500/20 bg-red-500/10 text-red-400"
          : "border-white/[0.06] bg-white/[0.03] text-slate-400";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${toneClasses}`}>
      {icon}
      {label}
    </span>
  );
}

export function StatusBadge({ phase, shuttingDown }: StatusBadgeProps) {
  if (phase === null) {
    return <Badge tone="slate" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label="Checking" />;
  }

  if (shuttingDown) {
    return <Badge tone="red" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label="Shutting Down" />;
  }

  if (phase === "online") {
    return <Badge tone="emerald" icon={<Power className="h-3.5 w-3.5" />} label="Online" />;
  }

  if (phase === "booting" || phase === "starting") {
    return <Badge tone="sky" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label="Waking Up" />;
  }

  return <Badge tone="slate" icon={<PowerOff className="h-3.5 w-3.5" />} label="Offline" />;
}
