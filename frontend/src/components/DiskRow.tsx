import { HardDrive, Layers } from "lucide-react";

function colorFor(percent: number): string {
  if (percent >= 90) return "#f87171";
  if (percent >= 70) return "#fbbf24";
  return "#34d399";
}

interface DiskRowProps {
  label: string;
  sublabel?: string;
  percent: number;
  rightText: string;
  muted?: boolean;
  total?: boolean;
}

export function DiskRow({ label, sublabel, percent, rightText, muted, total }: DiskRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const Icon = total ? Layers : HardDrive;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        total ? "border border-white/10 bg-white/[0.05]" : ""
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${total ? "text-sky-400" : "text-slate-500"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-sm ${total ? "font-semibold text-slate-50" : "font-medium text-slate-200"}`}>
            {label}
            {sublabel && <span className="ml-1.5 text-xs font-normal text-slate-500">{sublabel}</span>}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">{rightText}</span>
        </div>
        {muted ? (
          <p className="mt-1 text-xs text-slate-600">Not mounted</p>
        ) : (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${clamped}%`, background: colorFor(clamped) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
