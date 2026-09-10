# server-app

A self-hosted control panel for a home server that's normally powered off to save
electricity. A Raspberry Pi stays on 24/7 and acts as the always-available control
point: it can wake the main server with a Wake-on-LAN magic packet, shut it down
over SSH, and report live CPU / RAM / per-disk stats. The frontend is a PWA —
install it on your phone's home screen, or just open it in a browser from anywhere.

## Architecture

```
┌─────────────┐       HTTPS (Cloudflare Tunnel)      ┌──────────────────────────┐
│  Phone / PWA │ ───────────────────────────────────▶ │ Raspberry Pi (always on) │
│  or Browser  │ ◀─────────────────────────────────── │  backend + frontend      │
└─────────────┘                                       └───────────┬──────────────┘
                                                                    │
                                        ┌───────────────────────────┼───────────────────────────┐
                                        │ WoL magic packet (UDP)     │ SSH (shutdown / stats)     │
                                        ▼                            ▼
                                 ┌───────────────────────────────────────┐
                                 │   Home server (arr stack, Jellyfin)    │
                                 │   powered off when idle                │
                                 └─────────────────────────────────────────┘
```

- **backend/** — Node.js/TypeScript API that runs on the Pi. Sends the WoL packet,
  and SSHes into the server to shut it down or pull stats.
- **frontend/** — React + Vite PWA (installable on phone, works from any browser).
  Dashboard with power controls and live CPU/RAM/disk gauges.
- Both are served from the Pi behind your existing Cloudflare Tunnel, so there's
  a single public hostname and no ports opened on your router.

**No app-level login.** Access control is entirely Cloudflare Access on the
tunnel hostname (e.g. WARP-required, same pattern as this setup's other
services) — there's no username/password inside the app itself. Make sure the
Access policy for whatever hostname you route to this backend is actually
locked down before you deploy it, since the API trusts anything that reaches it.

## One-time setup on the target server (the arr stack / Jellyfin box)

1. **Enable Wake-on-LAN** on its NIC (BIOS setting + `ethtool -s <iface> wol g`,
   persisted via a systemd/udev rule or your distro's network manager). Note the
   interface's MAC address.
2. **Give the Pi SSH access** — generate a dedicated key on the Pi and copy it
   to the target server. Replace `REMOTE_USER`/`REMOTE_HOST` with real values
   (note: no `<` `>` around them — those are shell redirection characters and
   will break the command if left in):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_server -N ""
   ssh-copy-id -i ~/.ssh/id_ed25519_server.pub REMOTE_USER@REMOTE_HOST
   ```
3. **Allow passwordless shutdown** for that user — see
   [`backend/deploy/sudoers-shutdown.example`](backend/deploy/sudoers-shutdown.example).
4. **Install the stats script**:
   ```bash
   scp backend/deploy/remote-stats.sh REMOTE_USER@REMOTE_HOST:/tmp/
   ssh REMOTE_USER@REMOTE_HOST 'sudo install -m 755 /tmp/remote-stats.sh /usr/local/bin/server-app-stats.sh'
   ```
   Disks are auto-detected on the target (via `lsblk`) — no path configuration needed.

## Setup on the Raspberry Pi

```bash
git clone https://github.com/ZayanMA/server-app.git ~/server-app
cd ~/server-app

# Backend
cd backend
npm ci
cp .env.example .env        # fill in target host/MAC/SSH details — see .env.example
npm run build

# Frontend (built into backend's STATIC_DIR so one process serves everything)
cd ../frontend
npm ci
npm run build
```

Set `STATIC_DIR=../frontend/dist` in `backend/.env` (already the default) so the
backend serves the built PWA alongside its API.

Run it as a service (edit `User=`/paths in the unit file first if your Pi's
username or install path differ from the defaults):
```bash
sudo cp backend/deploy/server-app-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now server-app-backend
```

Finally, add an ingress rule to your Cloudflare Tunnel's `config.yml` pointing
your chosen hostname at `http://localhost:4000` (the `PORT` in `.env`), reload
`cloudflared`, then in the Cloudflare dashboard: create the DNS route for that
hostname and set (or confirm) the Access policy that gates it.

## Installing on your phone

Open the app's URL in your phone's browser and use "Add to Home Screen" (iOS
Safari) or the install prompt (Android Chrome) — it's a standard PWA, so it
installs like a native app icon with no app store involved.

## Local development

```bash
cd backend && npm install && npm run dev    # API on :4000
cd frontend && npm install && npm run dev   # UI on :5173, proxies /api to :4000
```

## Status

Core features shipped: wake, shutdown, live CPU/RAM/per-disk/uptime stats.
