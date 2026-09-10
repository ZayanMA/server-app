import { AlertTriangle, ChevronDown, ChevronUp, Clock, Cpu, MemoryStick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  getBootLog,
  getPowerStatus,
  getShutdownLog,
  getStats,
  shutdownServer,
  wakeServer,
  type PowerPhase,
  type TargetStats,
} from "../api";
import { BootProgress } from "../components/BootProgress";
import { DiskRow } from "../components/DiskRow";
import { GaugeCard } from "../components/GaugeCard";
import { LogPanel } from "../components/LogPanel";
import { PowerButton } from "../components/PowerButton";
import { ShutdownProgress } from "../components/ShutdownProgress";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatUptime } from "../format";

// Fast polling while something is actively changing (booting up), slower
// once settled (steady online or offline) so we're not hammering the target.
const ACTIVE_POLL_MS = 1500;
const IDLE_POLL_MS = 5000;
const STATS_POLL_MS = 5000;
const SHUTDOWN_LOG_POLL_MS = 1200;

export function Dashboard() {
  const [phase, setPhase] = useState<PowerPhase | null>(null);
  const [stats, setStats] = useState<TargetStats | null>(null);
  const [busyAction, setBusyAction] = useState<"wake" | "shutdown" | null>(null);
  const [shuttingDown, setShuttingDownState] = useState(false);
  const [shutdownLog, setShutdownLog] = useState<string[]>([]);
  const [bootLogOpen, setBootLogOpen] = useState(false);
  const [bootLog, setBootLog] = useState<string[] | null>(null);
  const [bootLogLoading, setBootLogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shuttingDownRef = useRef(false);

  function setShuttingDown(value: boolean) {
    shuttingDownRef.current = value;
    setShuttingDownState(value);
  }

  const online = phase === "online";

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getPowerStatus();
        if (cancelled) return;
        setPhase(result.phase);
        if (result.phase === "offline") setShuttingDown(false);
        const delay =
          result.phase === "booting" || result.phase === "starting" || shuttingDownRef.current
            ? ACTIVE_POLL_MS
            : IDLE_POLL_MS;
        timer = setTimeout(poll, delay);
      } catch {
        if (cancelled) return;
        setPhase(null);
        timer = setTimeout(poll, IDLE_POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!online) {
      setStats(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const result = await getStats();
        if (!cancelled) setStats(result);
      } catch {
        // transient stats failures aren't worth surfacing; next poll retries
      }
    }

    poll();
    const id = setInterval(poll, STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [online]);

  useEffect(() => {
    if (!shuttingDown) {
      setShutdownLog([]);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor: string | null = null;

    async function poll() {
      try {
        const page = await getShutdownLog(cursor);
        if (cancelled) return;
        cursor = page.cursor ?? cursor;
        if (page.lines.length > 0) setShutdownLog((prev) => [...prev, ...page.lines]);
        timer = setTimeout(poll, SHUTDOWN_LOG_POLL_MS);
      } catch {
        // SSH almost certainly just went away because the server powered
        // off — the phase poll will pick that up and clear shuttingDown.
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shuttingDown]);

  async function handleToggleBootLog() {
    if (bootLogOpen) {
      setBootLogOpen(false);
      return;
    }
    setBootLogOpen(true);
    setBootLogLoading(true);
    try {
      const result = await getBootLog();
      setBootLog(result.lines);
    } catch {
      setBootLog([]);
    } finally {
      setBootLogLoading(false);
    }
  }

  async function handleWake() {
    setError(null);
    setBusyAction("wake");
    try {
      await wakeServer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to wake server");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleShutdown() {
    if (!window.confirm("Shut down the server now?")) return;
    setError(null);
    setBusyAction("shutdown");
    try {
      await shutdownServer();
      setShuttingDown(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to shut down server");
    } finally {
      setBusyAction(null);
    }
  }

  const memoryPercent = stats ? (stats.memory.used / stats.memory.total) * 100 : 0;

  const totalDiskSize = stats?.disks.reduce((sum, disk) => sum + disk.sizeBytes, 0) ?? 0;
  const totalDiskUsed = stats?.disks.reduce((sum, disk) => sum + (disk.mounted ? disk.usedBytes : 0), 0) ?? 0;
  const totalDiskPercent = totalDiskSize > 0 ? (totalDiskUsed / totalDiskSize) * 100 : 0;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Server Control
          </h1>
          <div className="mt-2">
            <StatusBadge phase={phase} shuttingDown={shuttingDown} />
          </div>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <PowerButton action="wake" disabled={online} busy={busyAction === "wake"} onClick={handleWake} />
        <PowerButton
          action="shutdown"
          disabled={!online || shuttingDown}
          busy={busyAction === "shutdown"}
          onClick={handleShutdown}
        />
      </div>

      {error && (
        <div className="animate-fade-in mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {online && shuttingDown && <ShutdownProgress log={shutdownLog} />}

      {online && !shuttingDown && stats && (
        <div className="animate-fade-in flex flex-col gap-6">
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">System</h2>
            <div className="grid grid-cols-2 gap-3">
              <GaugeCard icon={Cpu} label="CPU" percent={stats.cpuPercent} detail={`${stats.cpuPercent}% used`} />
              <GaugeCard
                icon={MemoryStick}
                label="Memory"
                percent={memoryPercent}
                detail={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Storage</h2>
            <div className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2">
              <DiskRow
                label="Total"
                percent={totalDiskPercent}
                rightText={`${formatBytes(totalDiskUsed)} / ${formatBytes(totalDiskSize)}`}
                total
              />
              <div className="mx-2 h-px bg-white/[0.06]" />
              {stats.disks.map((disk) => (
                <DiskRow
                  key={disk.device}
                  label={disk.device}
                  sublabel={disk.model}
                  percent={disk.mounted ? (disk.usedBytes / disk.sizeBytes) * 100 : 0}
                  muted={!disk.mounted}
                  rightText={disk.mounted ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.sizeBytes)}` : formatBytes(disk.sizeBytes)}
                />
              ))}
            </div>
          </section>

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Up {formatUptime(stats.uptimeSeconds)}
          </p>

          <div>
            <button
              type="button"
              onClick={handleToggleBootLog}
              className="mx-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
            >
              {bootLogOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {bootLogOpen ? "Hide boot log" : "View boot log"}
            </button>
            {bootLogOpen && (
              <div className="mt-2">
                <LogPanel lines={bootLogLoading ? [] : (bootLog ?? [])} emptyText={bootLogLoading ? "Loading…" : "No log entries."} />
              </div>
            )}
          </div>
        </div>
      )}

      {phase !== null && !online && <BootProgress phase={phase} />}
    </div>
  );
}
