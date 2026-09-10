export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export type PowerPhase = "offline" | "booting" | "starting" | "online";

export function getPowerStatus(): Promise<{ phase: PowerPhase }> {
  return request("/power/status");
}

export function wakeServer(): Promise<{ ok: true }> {
  return request("/power/wake", { method: "POST" });
}

export function shutdownServer(): Promise<{ ok: true }> {
  return request("/power/shutdown", { method: "POST" });
}

export interface TargetStats {
  cpuPercent: number;
  memory: { total: number; used: number };
  disks: Array<{
    device: string;
    model: string;
    sizeBytes: number;
    usedBytes: number;
    availableBytes: number;
    mounted: boolean;
  }>;
  uptimeSeconds: number;
}

export function getStats(): Promise<TargetStats> {
  return request("/stats");
}
