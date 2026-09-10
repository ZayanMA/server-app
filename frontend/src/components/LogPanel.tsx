import { useEffect, useRef } from "react";

interface LogPanelProps {
  lines: string[];
  autoScroll?: boolean;
  emptyText?: string;
}

export function LogPanel({ lines, autoScroll, emptyText = "No log entries yet." }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  return (
    <div ref={scrollRef} className="max-h-56 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
      {lines.length === 0 ? (
        <p className="text-slate-600">{emptyText}</p>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))
      )}
    </div>
  );
}
