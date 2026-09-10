import { Loader2, Power, PowerOff } from "lucide-react";

interface StatusBadgeProps {
  online: boolean | null;
}

export function StatusBadge({ online }: StatusBadgeProps) {
  if (online === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        online
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-white/[0.06] bg-white/[0.03] text-slate-400"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-500"}`} />
      </span>
      {online ? (
        <>
          <Power className="h-3.5 w-3.5" /> Online
        </>
      ) : (
        <>
          <PowerOff className="h-3.5 w-3.5" /> Offline
        </>
      )}
    </span>
  );
}
