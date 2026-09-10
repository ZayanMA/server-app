import { readFileSync } from "node:fs";
import { NodeSSH } from "node-ssh";
import { config } from "../config.js";

const CONNECT_TIMEOUT_MS = 5000;

let cachedPrivateKey: string | null = null;
function privateKey(): string {
  if (!cachedPrivateKey) {
    cachedPrivateKey = readFileSync(config.target.sshPrivateKeyPath, "utf8");
  }
  return cachedPrivateKey;
}

async function withConnection<T>(fn: (ssh: NodeSSH) => Promise<T>): Promise<T> {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: config.target.host,
      port: config.target.sshPort,
      username: config.target.sshUser,
      privateKey: privateKey(),
      readyTimeout: CONNECT_TIMEOUT_MS,
    });
    return await fn(ssh);
  } finally {
    ssh.dispose();
  }
}

/** Whether the target server is currently reachable over SSH. */
export async function isTargetOnline(): Promise<boolean> {
  try {
    await withConnection(async () => true);
    return true;
  } catch {
    return false;
  }
}

export async function shutdownTarget(): Promise<void> {
  await withConnection(async (ssh) => {
    const result = await ssh.execCommand("sudo -n shutdown -h now");
    if (result.code !== 0) {
      throw new Error(`shutdown command failed: ${result.stderr || result.stdout}`);
    }
  });
}

export interface TargetStats {
  cpuPercent: number;
  memory: { total: number; used: number };
  disks: Array<{ path: string; size: number; used: number; available: number }>;
  uptimeSeconds: number;
}

export async function getTargetStats(): Promise<TargetStats> {
  return withConnection(async (ssh) => {
    const result = await ssh.execCommand(
      `DISK_PATHS="${config.target.statsDiskPaths}" bash ${config.target.statsScriptPath}`,
    );
    if (result.code !== 0) {
      throw new Error(`stats script failed: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout) as TargetStats;
  });
}
