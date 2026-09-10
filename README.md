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

## Status

Early scaffold — see commit history for progress. Setup/deployment instructions
will land in this README as each piece is built.
