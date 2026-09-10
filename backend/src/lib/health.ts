import { execFile } from "node:child_process";
import net from "node:net";

/** ICMP reachability — works even before the target's SSH daemon (or any
 * service) has started, so it's the earliest signal we can get after a WoL. */
export function pingTarget(host: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      "ping",
      ["-c", "1", "-W", String(Math.max(1, Math.ceil(timeoutMs / 1000))), host],
      { timeout: timeoutMs + 500 },
      (error) => resolve(!error),
    );
  });
}

/** Plain TCP connect check — true once something is listening on the port,
 * well before we attempt (and wait out) a full SSH handshake + auth. */
export function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
