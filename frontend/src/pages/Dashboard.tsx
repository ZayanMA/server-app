import { useCallback, useEffect, useState } from "react";
import { ApiError, getPowerStatus, getStats, shutdownServer, wakeServer, type TargetStats } from "../api";
import { GaugeCard } from "../components/GaugeCard";
import { PowerButton } from "../components/PowerButton";
import { StatusBadge } from "../components/StatusBadge";
import { formatBytes, formatUptime } from "../format";

const STATUS_POLL_MS = 5000;
const STATS_POLL_MS = 5000;

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState<TargetStats | null>(null);
  const [busyAction, setBusyAction] = useState<"wake" | "shutdown" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return true;
      }
      return false;
    },
    [onLogout],
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getPowerStatus();
        if (!cancelled) setOnline(result.online);
      } catch (err) {
        if (!handleAuthError(err) && !cancelled) setOnline(null);
      }
    }

    poll();
    const id = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [handleAuthError]);

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
      } catch (err) {
        handleAuthError(err);
      }
    }

    poll();
    const id = setInterval(poll, STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [online, handleAuthError]);

  async function handleWake() {
    setError(null);
    setBusyAction("wake");
    try {
      await wakeServer();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Failed to wake server");
      }
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
      if (!handleAuthError(err)) {
        setError(err instanceof ApiError ? err.message : "Failed to shut down server");
      }
    } finally {
      setBusyAction(null);
    }
  }

  const memoryPercent = stats ? (stats.memory.used / stats.memory.total) * 100 : 0;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Server Control</h1>
          <div className="mt-1">
            <StatusBadge online={online} />
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          Log out
        </button>
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
            {stats.disks.map((disk) => (
              <GaugeCard
                key={disk.path}
                label={disk.path === "/" ? "Disk" : disk.path}
                percent={(disk.used / disk.size) * 100}
                detail={`${formatBytes(disk.used)} / ${formatBytes(disk.size)}`}
              />
            ))}
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
