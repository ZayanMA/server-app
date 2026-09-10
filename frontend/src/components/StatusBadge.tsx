interface StatusBadgeProps {
  online: boolean | null;
}

export function StatusBadge({ online }: StatusBadgeProps) {
  if (online === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-500" />
        Checking…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
        online ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-500"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
