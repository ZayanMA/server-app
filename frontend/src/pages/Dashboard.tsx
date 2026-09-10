import { AlertTriangle, Clock, Cpu, MemoryStick, ServerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, getPowerStatus, getStats, shutdownServer, wakeServer, type TargetStats } from "../api";
import { DiskRow } from "../components/DiskRow";
import { GaugeCard } from "../components/GaugeCard";
import { PowerButton } from "../components/PowerButton";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatUptime } from "../format";

const STATUS_POLL_MS = 5000;
const STATS_POLL_MS = 5000;

export function Dashboard() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState<TargetStats | null>(null);
  const [busyAction, setBusyAction] = useState<"wake" | "shutdown" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getPowerStatus();
        if (!cancelled) setOnline(result.online);
      } catch {
        if (!cancelled) setOnline(null);
      }
    }

    poll();
    const id = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
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
            <StatusBadge online={online} />
          </div>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <PowerButton action="wake" disabled={online === true} busy={busyAction === "wake"} onClick={handleWake} />
        <PowerButton
          action="shutdown"
          disabled={online !== true}
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

      {online && stats && (
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
        </div>
      )}

      {online === false && (
        <div className="animate-fade-in flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-14 text-center">
          <ServerOff className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            Server is offline. Hit <span className="text-slate-300">Wake Server</span> to boot it.
          </p>
        </div>
      )}
    </div>
  );
}
