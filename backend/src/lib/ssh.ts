import { readFileSync } from "node:fs";
import { NodeSSH } from "node-ssh";
import { config } from "../config.js";
import { isPortOpen, pingTarget } from "./health.js";

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

export type PowerPhase = "offline" | "booting" | "starting" | "online";

/**
 * Boot progress, cheapest signal first: a WoL'd machine responds to ping
 * (kernel + network up) well before its SSH daemon is listening, which in
 * turn comes up before our key is actually accepted (host keys, PAM, etc.
 * still settling). Each stage only runs if the previous one already passed.
 */
export async function getPowerPhase(): Promise<PowerPhase> {
  const portOpen = await isPortOpen(config.target.host, config.target.sshPort);
  if (!portOpen) {
    const pingOk = await pingTarget(config.target.host);
    return pingOk ? "booting" : "offline";
  }

  try {
    await withConnection(async () => true);
    return "online";
  } catch {
    return "starting";
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

export async function getTargetStats(): Promise<TargetStats> {
  return withConnection(async (ssh) => {
    const result = await ssh.execCommand(`bash ${config.target.statsScriptPath}`);
    if (result.code !== 0) {
      throw new Error(`stats script failed: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout) as TargetStats;
  });
}
