const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(percent: number): string {
  if (percent >= 90) return "#f87171";
  if (percent >= 70) return "#fbbf24";
  return "#38bdf8";
}

interface GaugeCardProps {
  label: string;
  percent: number;
  detail: string;
}

export function GaugeCard({ label, percent, detail }: GaugeCardProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = colorFor(clamped);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-800/60 p-5 shadow-lg shadow-black/20 ring-1 ring-white/5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90"
          style={{ transformOrigin: "50px 50px", fill: "#e2e8f0", fontSize: "22px", fontWeight: 600 }}
        >
          {Math.round(clamped)}%
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
