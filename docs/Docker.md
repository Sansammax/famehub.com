# FameHub Containerization & Docker Reference

This document covers Docker-specific details, container commands, and image builds.

## Images

FameHub utilizes two custom Docker images:

### 1. Frontend Image (`famehub-frontend`)
- **Base image**: `node:20-alpine` (builder) -> `nginx:alpine` (runner)
- **Port**: 80
- Serves static compiled Vite SPA bundles.
- Contains an internal Nginx router that rewrites all unmatched sub-paths to `index.html` to support client-side SPA routing.

### 2. Backend Image (`famehub-backend`)
- **Base image**: `node:20-alpine`
- **Port**: 5000
- Runs the Node API server and the WebSocket server.
- Uses `node` (non-root) user for security isolation.
- Implements dynamic healthchecking checks hitting `/health`.

## Common Container Commands

### Build Images Manually
```bash
# Frontend
docker build -t famehub-frontend:latest -f Dockerfile .

# Backend
docker build -t famehub-backend:latest -f backend/Dockerfile ./backend
```

### View Live Container Logs
```bash
# View all container streams
docker compose logs -f

# View backend only
docker compose logs -f backend
```

### Access Backend Shell
```bash
docker exec -it famehub-backend sh
```

### Stop the Complete Application Stack
```bash
docker compose down
```
*Note: To purge database storage volumes, run `docker compose down -v`.*
