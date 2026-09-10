import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  staticDir: process.env.STATIC_DIR,

  target: {
    host: required("TARGET_HOST"),
    macAddress: required("TARGET_MAC_ADDRESS"),
    broadcastAddress: process.env.TARGET_BROADCAST_ADDRESS ?? "255.255.255.255",
    wolPort: Number(process.env.TARGET_WOL_PORT ?? 9),

    sshPort: Number(process.env.TARGET_SSH_PORT ?? 22),
    sshUser: required("TARGET_SSH_USER"),
    sshPrivateKeyPath: required("TARGET_SSH_PRIVATE_KEY_PATH"),

    statsScriptPath: process.env.STATS_SCRIPT_PATH ?? "/usr/local/bin/server-app-stats.sh",
  },
} as const;
