#!/usr/bin/env bash
# Deployed on the TARGET server (not the Pi). Prints a single line of JSON with
# CPU/RAM/per-physical-disk/uptime stats. Called over SSH by the backend — see
# src/lib/ssh.ts. Disks are auto-detected via lsblk (no config needed): each
# physical disk's usage is the sum of its mounted partitions' usage.
set -euo pipefail

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

# One line per block device, shell-safe KEY="VALUE" pairs, flat (no tree
# nesting) with PKNAME giving each partition's parent disk.
disks_json=""
while IFS= read -r line; do
  eval "$line"
  [ "$TYPE" = "disk" ] || continue

  disk_name="$NAME"
  size="$SIZE"
  used=0
  avail=0
  mounted="false"

  while IFS= read -r part_line; do
    eval "$part_line"
    [ "$PKNAME" = "$disk_name" ] || continue
    [ -n "$MOUNTPOINT" ] || continue
    read -r p_used p_avail < <(df -B1 --output=used,avail "$MOUNTPOINT" 2>/dev/null | tail -n 1) || continue
    used=$((used + p_used))
    avail=$((avail + p_avail))
    mounted="true"
  done < <(lsblk -b -P -n -o NAME,PKNAME,MOUNTPOINT)

  model=$(lsblk -n -o MODEL "/dev/$disk_name" 2>/dev/null | xargs || true)
  entry=$(printf '{"device":"%s","model":"%s","sizeBytes":%s,"usedBytes":%s,"availableBytes":%s,"mounted":%s}' \
    "$disk_name" "$model" "$size" "$used" "$avail" "$mounted")
  disks_json="${disks_json}${disks_json:+,}${entry}"
done < <(lsblk -b -P -n -o NAME,TYPE,SIZE)

printf '{"cpuPercent":%s,"memory":{"total":%s,"used":%s},"disks":[%s],"uptimeSeconds":%s}\n' \
  "$cpu_percent" "$mem_total" "$mem_used" "$disks_json" "$uptime_seconds"
