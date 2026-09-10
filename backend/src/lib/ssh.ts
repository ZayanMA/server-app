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

/** The complete systemd/kernel journal for the current boot — fetched once
 * SSH is reachable, since there's no way to see anything before that without
 * extra hardware (a serial console tap). */
export async function getBootLog(): Promise<string[]> {
  return withConnection(async (ssh) => {
    const result = await ssh.execCommand("journalctl -b -q --no-pager -o short-iso -n 300");
    if (result.code !== 0) {
      throw new Error(`journalctl failed: ${result.stderr || result.stdout}`);
    }
    return result.stdout.split("\n").filter((line) => line.trim().length > 0);
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface JournalPage {
  lines: string[];
  cursor: string | null;
}

// A fresh SSH connection logs its own "session opened/closed" lines to the
// journal. Polling every ~1s for a shutdown-log with a brand-new connection
// each time would flood the log with that noise instead of the actual
// shutdown sequence, so this reuses one connection across an entire polling
// run (started fresh whenever the frontend asks without a cursor, i.e. the
// start of a new shutdown) instead of one-shot `withConnection`.
let journalConnection: NodeSSH | null = null;

function releaseJournalConnection(): void {
  journalConnection?.dispose();
  journalConnection = null;
}

async function getJournalConnection(): Promise<NodeSSH> {
  if (journalConnection) return journalConnection;
  const ssh = new NodeSSH();
  await ssh.connect({
    host: config.target.host,
    port: config.target.sshPort,
    username: config.target.sshUser,
    privateKey: privateKey(),
    readyTimeout: CONNECT_TIMEOUT_MS,
  });
  journalConnection = ssh;
  return ssh;
}

/**
 * Incremental journal tail, used to live-stream shutdown progress (the
 * server stays fully reachable right up until it actually powers off, so
 * this works all the way to the end unlike boot). Pass back the returned
 * cursor to get only lines added since the last call; omit it to start a
 * fresh polling run (e.g. a new shutdown, or the page was reloaded).
 */
export async function getJournalPage(afterCursor?: string): Promise<JournalPage> {
  if (!afterCursor) releaseJournalConnection();

  try {
    const ssh = await getJournalConnection();
    const selector = afterCursor ? `--after-cursor=${shellQuote(afterCursor)}` : "-n 10";
    const result = await ssh.execCommand(`journalctl -q --no-pager -o short-iso --show-cursor ${selector}`);
    if (result.code !== 0) {
      throw new Error(`journalctl failed: ${result.stderr || result.stdout}`);
    }

    const lines: string[] = [];
    let cursor: string | null = null;
    for (const raw of result.stdout.split("\n")) {
      const line = raw.trimEnd();
      if (!line) continue;
      const match = line.match(/^-- cursor: (.+)$/);
      if (match) {
        cursor = match[1];
      } else {
        lines.push(line);
      }
    }
    return { lines, cursor };
  } catch (err) {
    releaseJournalConnection();
    throw err;
  }
}
