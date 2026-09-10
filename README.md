# server-app

A self-hosted control panel for a home server that's normally powered off to save
electricity. A Raspberry Pi stays on 24/7 and acts as the always-available control
point: it can wake the main server with a Wake-on-LAN magic packet, shut it down
over SSH, and report live CPU / RAM / disk stats. The frontend is a PWA — install
it on your phone's home screen, or just open it in a browser from anywhere.

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
  SSHes into the server to shut it down or pull stats, and issues its own
  auth (JWT) for the app.
- **frontend/** — React + Vite PWA (installable on phone, works from any browser).
  Login screen + dashboard with power controls and live CPU/RAM/disk gauges.
- Both are served from the Pi behind your existing Cloudflare Tunnel, so there's
  a single public hostname and no ports opened on your router.

## One-time setup on the target server (the arr stack / Jellyfin box)

1. **Enable Wake-on-LAN** on its NIC (BIOS setting + `ethtool -s <iface> wol g`,
   persisted via a systemd/udev rule or your distro's network manager). Note the
   interface's MAC address.
2. **Give the Pi SSH access** — if it doesn't already have a key-based login:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_server -N ""   # run on the Pi
   ssh-copy-id -i ~/.ssh/id_ed25519_server.pub <user>@<server>
   ```
3. **Allow passwordless shutdown** for that user — see
   [`backend/deploy/sudoers-shutdown.example`](backend/deploy/sudoers-shutdown.example).
4. **Install the stats script**:
   ```bash
   scp backend/deploy/remote-stats.sh <user>@<server>:/tmp/
   ssh <user>@<server> 'sudo install -m 755 /tmp/remote-stats.sh /usr/local/bin/server-app-stats.sh'
   ```

## Setup on the Raspberry Pi

```bash
git clone https://github.com/ZayanMA/server-app.git /opt/server-app
cd /opt/server-app

# Backend
cd backend
npm ci
cp .env.example .env        # fill in target host/MAC, SSH details, auth secrets — see below
npm run build

# Frontend (built into backend's STATIC_DIR so one process serves everything)
cd ../frontend
npm ci
npm run build
```

Generate the two secrets `.env` needs:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"   # APP_PASSWORD_HASH
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # APP_JWT_SECRET
```

Set `STATIC_DIR=../frontend/dist` in `backend/.env` (already the default) so the
backend serves the built PWA alongside its API.

Run it as a service:
```bash
sudo cp backend/deploy/server-app-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now server-app-backend
```

Finally, point your existing Cloudflare Tunnel at `http://localhost:4000` (the
`PORT` in `.env`) under whatever hostname you want the app on.

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

Core features shipped: login, wake, shutdown, live CPU/RAM/disk/uptime stats.
