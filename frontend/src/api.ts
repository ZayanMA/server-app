const TOKEN_KEY = "server-app.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function login(username: string, password: string): Promise<{ token: string }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function getPowerStatus(): Promise<{ online: boolean }> {
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
  disks: Array<{ path: string; size: number; used: number; available: number }>;
  uptimeSeconds: number;
}

export function getStats(): Promise<TargetStats> {
  return request("/stats");
}
