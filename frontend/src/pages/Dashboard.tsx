import { useEffect, useState } from "react";
import { ApiError, getPowerStatus, getStats, shutdownServer, wakeServer, type TargetStats } from "../api";
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

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Server Control</h1>
        <div className="mt-1">
          <StatusBadge online={online} />
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <PowerButton action="wake" disabled={online === true} busy={busyAction === "wake"} onClick={handleWake} />
        <PowerButton
          action="shutdown"
          disabled={online !== true}
          busy={busyAction === "shutdown"}
          onClick={handleShutdown}
        />
      </div>

      {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

      {online && stats && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <GaugeCard label="CPU" percent={stats.cpuPercent} detail={`${stats.cpuPercent}% used`} />
            <GaugeCard
              label="Memory"
              percent={memoryPercent}
              detail={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
            />
            {stats.disks.map((disk) =>
              disk.mounted ? (
                <GaugeCard
                  key={disk.device}
                  label={disk.device}
                  percent={(disk.usedBytes / disk.sizeBytes) * 100}
                  detail={`${formatBytes(disk.usedBytes)} / ${formatBytes(disk.sizeBytes)}${disk.model ? ` · ${disk.model}` : ""}`}
                />
              ) : (
                <GaugeCard
                  key={disk.device}
                  label={disk.device}
                  percent={0}
                  detail={`Not mounted · ${formatBytes(disk.sizeBytes)}${disk.model ? ` · ${disk.model}` : ""}`}
                />
              ),
            )}
          </div>
          <p className="text-center text-sm text-slate-500">Uptime: {formatUptime(stats.uptimeSeconds)}</p>
        </>
      )}

      {online === false && (
        <p className="text-center text-sm text-slate-500">
          Server is offline. Hit "Wake Server" to boot it.
        </p>
      )}
    </div>
  );
}
