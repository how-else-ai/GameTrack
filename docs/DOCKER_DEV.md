# Docker Development Environment

This project can be developed entirely inside a Docker container using Docker-in-Docker (DinD). This guide covers the setup for the GameTrack monorepo.

## Prerequisites

- Docker Engine (latest)
- Docker socket mounted into your dev container (`/var/run/docker.sock`)
- Host machine with at least 4GB RAM available for containers

## Quick Start

### Build the Development Image

```bash
cd GameTrack
docker build -t gametrack-dev .
```

### Run the Container

```bash
docker run -d --name gametrack-web \
  -p 0.0.0.0:3000:3000 \
  -p 0.0.0.0:8081:8081 \
  gametrack-dev:latest
```

### Access the Apps

| Service | Port | URL |
|---------|------|-----|
| Next.js Web App | 3000 | http://HOST_IP:3000 |
| Expo Mobile Dev Server | 8081 | http://HOST_IP:8081 |

Replace `HOST_IP` with your machine's LAN IP (e.g., `192.168.0.188`).

## Expo Go Setup

### First-Time Login

Expo requires authentication inside the container. After starting the container:

```bash
docker exec -it gametrack-web sh
cd /app/apps/mobile
npx expo login
```

Follow the prompts to log in with your Expo account. **This login is container-specific** — the auth token lives inside the container, not on your host.

### Reconnecting After Rebuild

If you rebuild the image or recreate the container, you'll need to re-run `npx expo login`.

### Scanning the QR Code

1. Open Expo Go on your phone
2. Make sure your phone is on the same network as the host
3. Scan the QR code shown in the container terminal (or use the URL manually)
4. The URL uses your host's LAN IP, not the container's bridge IP

To see the QR code from your host:

```bash
docker exec gametrack-web bun -e "
const QRCode = require('qrcode');
QRCode.toString('exp://YOUR_HOST_IP:8081', {type:'terminal', small:true}, (err, qr) => {
  if(err) console.error(err); else console.log(qr);
});"
```

## Dockerfile Details

The Dockerfile (`~/GameTrack/Dockerfile`) handles:

1. **Base image**: `oven/bun:alpine` with git and curl
2. **Dependencies**: Installs for root, `packages/core`, and `apps/mobile`
3. **Prisma**: Generates the client during build
4. **Core package**: Builds with tsup (ESM + CJS + types)
5. **Mobile deps**: Adds `react-native-web` and `react-dom@19.2.0`
6. **Dotslash fix**: Removes problematic React Native DevTools binary (Alpine compat)
7. **Start script**: Launches Next.js + Expo in parallel

### Known Fixes Applied

| Issue | Fix |
|-------|-----|
| Dotslash binary fails on Alpine | Removed `/root/.cache/dotslash` and the devtools binary |
| SQLite URL validation error | Use `file:` protocol prefix in `DATABASE_URL` |
| Expo "non-interactive mode" error | No trailing `--` flag on `expo start` command |
| Expo Go auth mismatch | Log in inside the container, not on host |

## Networking Notes

- Use `-p 0.0.0.0:PORT:PORT` to expose on all host interfaces
- `--network host` does NOT give access to the actual host network in DinD — it shares the outer container's namespace
- `curl localhost:PORT` from inside the outer container will NOT reach the gametrack container — use the container bridge IP or host LAN IP

## Rebuilding

```bash
docker stop gametrack-web && docker rm gametrack-web
cd ~/GameTrack
docker build -t gametrack-dev .
docker run -d --name gametrack-web \
  -p 0.0.0.0:3000:3000 \
  -p 0.0.0.0:8081:8081 \
  gametrack-dev:latest
```

After rebuilding, remember to re-run `npx expo login` inside the new container.
