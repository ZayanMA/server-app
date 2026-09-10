import type { LucideIcon } from "lucide-react";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function toneFor(percent: number): { ring: string; glow: string; icon: string } {
  if (percent >= 90) return { ring: "#f87171", glow: "rgba(248,113,113,0.25)", icon: "text-red-400" };
  if (percent >= 70) return { ring: "#fbbf24", glow: "rgba(251,191,36,0.2)", icon: "text-amber-400" };
  return { ring: "#34d399", glow: "rgba(52,211,153,0.18)", icon: "text-emerald-400" };
}

interface GaugeCardProps {
  icon: LucideIcon;
  label: string;
  percent: number;
  detail: string;
  muted?: boolean;
}

export function GaugeCard({ icon: Icon, label, percent, detail, muted }: GaugeCardProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const tone = muted ? { ring: "#475569", glow: "transparent", icon: "text-slate-500" } : toneFor(clamped);

  return (
    <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-transform hover:-translate-y-0.5">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90" style={{ filter: `drop-shadow(0 0 8px ${tone.glow})` }}>
          <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke={tone.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <Icon className={`h-6 w-6 ${tone.icon}`} strokeWidth={2} />
      </div>
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-100">
          {label}
          {!muted && <span className="text-xs font-normal text-slate-400">{Math.round(clamped)}%</span>}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
