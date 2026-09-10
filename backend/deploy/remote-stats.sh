#!/usr/bin/env bash
# Deployed on the TARGET server (not the Pi). Prints a single line of JSON with
# CPU/RAM/disk/uptime stats. Called over SSH by the backend — see src/lib/ssh.ts.
#
# Install:
#   scp remote-stats.sh you@server:/tmp/
#   ssh you@server 'sudo install -m 755 /tmp/remote-stats.sh /usr/local/bin/server-app-stats.sh'
#
# Usage: DISK_PATHS="/ /mnt/storage" bash server-app-stats.sh
set -euo pipefail

DISK_PATHS="${DISK_PATHS:-/}"

# Sample /proc/stat twice, 300ms apart, to compute CPU usage over that window.
read -r _ u1 n1 s1 i1 w1 _ < /proc/stat
sleep 0.3
read -r _ u2 n2 s2 i2 w2 _ < /proc/stat

busy1=$((u1 + n1 + s1))
busy2=$((u2 + n2 + s2))
total1=$((busy1 + i1 + w1))
total2=$((busy2 + i2 + w2))

d_total=$((total2 - total1))
d_busy=$((busy2 - busy1))

if [ "$d_total" -gt 0 ]; then
  cpu_percent=$((100 * d_busy / d_total))
else
  cpu_percent=0
fi

read -r mem_total mem_used < <(free -b | awk '/^Mem:/ {print $2, $3}')

uptime_seconds=$(awk '{print int($1)}' /proc/uptime)

disks_json=""
for path in $DISK_PATHS; do
  read -r size used avail < <(df -B1 --output=size,used,avail "$path" 2>/dev/null | tail -n 1) || continue
  if [ -n "${size:-}" ]; then
    entry=$(printf '{"path":"%s","size":%s,"used":%s,"available":%s}' "$path" "$size" "$used" "$avail")
    disks_json="${disks_json}${disks_json:+,}${entry}"
  fi
done

printf '{"cpuPercent":%s,"memory":{"total":%s,"used":%s},"disks":[%s],"uptimeSeconds":%s}\n' \
  "$cpu_percent" "$mem_total" "$mem_used" "$disks_json" "$uptime_seconds"
