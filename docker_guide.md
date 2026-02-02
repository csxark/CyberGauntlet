# Docker Setup Guide - Enterprise-Style Containerization (CyberGauntlet)

<div align="center">

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5173-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=000000)

Optional, dev-first Docker workflow for consistent onboarding and reproducible local development.

[Quick Start](#quick-start) • [Architecture](#architecture-overview) • [Dev vs Prod](#dev-vs-production-like-stacks) • [Commands](#command-reference) • [Troubleshooting](#troubleshooting)

</div>

---

## Why Docker? (Benefits + Comparison)

CyberGauntlet is a frontend-only Vite + React + TypeScript project, but local development can still suffer from:
- Node/runtime drift across contributors
- dependency installation differences across OSes
- "it works on my machine" build/runtime inconsistencies
- hard-to-reset local environments

Docker standardizes the runtime so contributors can focus on building challenges/UI, not debugging setup.

### Traditional vs Docker (Local Dev)

| Category | Traditional Setup | Docker Setup | Practical Advantage |
|---------:|-------------------|-------------|---------------------|
| Setup time | Install Node + deps locally | `docker compose up --build` | Faster onboarding for new contributors |
| Consistency | Varies by OS/Node tooling | Same container runtime | Reduces environment drift |
| Dependency isolation | Host installs can conflict | Dependencies live in container volumes | Fewer local conflicts |
| Resetability | Manual cleanup/reinstall | `docker compose down -v` | Clean slate in one command |
| Reproducibility | Depends on local tooling | Repeatable Dockerfile + pinned base image | Easier bug reproduction |
| Challenge authoring | Depends on host env | Same workflow on all OSes | Consistent experience for contributors |

---

## Executive Summary

This Docker implementation provides:
- A containerized dev environment that behaves the same on Windows/macOS/Linux
- A single-command start for contributors (`docker compose up --build`)
- A production-like workflow for parity checks (`docker-compose.prod.yml`)

Docker usage is optional and does not replace the current `npm install && npm run dev` workflow.

---

## Prerequisites

- Docker Desktop (Windows/macOS) OR Docker Engine (Linux)
- Docker Compose v2 (`docker compose ...`)

Verify:
```bash
docker --version
docker compose version
```

---

## Quick Start

### Dev stack (recommended)
```bash
docker compose up --build
```

Open:
- App: http://localhost:5173

Stop:
```bash
docker compose down
```

Reset (removes the `node_modules` volume):
```bash
docker compose down -v
```

---

## Dev vs Production-like Stacks

### Dev stack (`docker-compose.yml`)
Best for daily development:
- bind mount for instant edits to `src/` and `public/` (including `public/challenges/`)
- named volume for `node_modules` to avoid OS-specific conflicts
- healthcheck to signal readiness

```bash
docker compose up --build
```

### Production-like stack (`docker-compose.prod.yml`)
Best for parity checks:
- builds assets via `npm run build`
- serves them via `vite preview`
- no bind mounts (closer to deployment behavior)

```bash
docker compose -f docker-compose.prod.yml up --build
```

Open:
- Preview: http://localhost:8080

---

## Architecture Overview

### Container topology (dev)
```
Docker Host (Your OS)
  └── http://localhost:5173  ->  frontend (Vite dev server, HMR)
```

### Volume strategy (cross-platform reliability)
This setup intentionally separates:
- Source code (bind mount): `./:/app` for instant edits and HMR
- Dependencies (named volume): `/app/node_modules` to avoid:
  - Windows/macOS permission issues
  - host filesystem performance penalties on Docker Desktop shares
  - host `node_modules` drift affecting builds

---

## Dockerfile Design (Multi-Stage Builds)

Targets in `Dockerfile`:
- `dev`: runs `vite` with `--host 0.0.0.0` on port `5173`
- `build`: generates `dist/` via `npm run build`
- `prod`: serves the production build via `vite preview` on port `4173`

Why multi-stage:
- clean separation of dev and production-like behavior
- better caching (deps layer changes less often than source)
- CI-friendly targets without adding separate Dockerfiles

---

## Environment Variables (Supabase)

CyberGauntlet supports optional Supabase integration:
- `.env.example` documents required values
- Compose loads `.env.example` as defaults (safe placeholders)
- for real credentials, create a local `.env` (do not commit it)

Vite only exposes variables prefixed with `VITE_` to the client.

---

## Recommended "Pre-Push" Check (One Command)

If Docker Engine is running, this single PowerShell command builds, boots, checks readiness, and shuts down:
```powershell
docker compose up -d --build; $ErrorActionPreference='Stop'; 1..60 | % { try { (Invoke-WebRequest http://localhost:5173 -UseBasicParsing).StatusCode | Out-Null; break } catch { Start-Sleep 2 } }; docker compose ps; docker compose down
```

---

## Command Reference

```bash
# Dev stack
docker compose up --build
docker compose up -d --build
docker compose logs -f
docker compose ps
docker compose down
docker compose down -v

# Prod-like stack
docker compose -f docker-compose.prod.yml up --build
docker compose -f docker-compose.prod.yml down
```

---

## Troubleshooting

### Port already in use
If `5173` is busy, stop the conflicting process or change the port mapping in `docker-compose.yml`.

### Changes not reflected (Windows/macOS)
`CHOKIDAR_USEPOLLING=true` is set to improve file watching reliability on Docker Desktop file shares.

### Docker engine not running
If you see errors about the Docker engine/pipe, start Docker Desktop (WSL2 recommended on Windows).

---

Document Version: 1.1.0  
Last Updated: 2026-01-19  
Scope: local development tooling only (optional, non-intrusive)
