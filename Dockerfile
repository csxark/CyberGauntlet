# CyberGauntlet Dockerfile (frontend-only Vite + React + TypeScript)
#
# Goals:
# - One-command local dev via Docker Compose
# - Reproducible dependency installs (npm ci)
# - Fast rebuilds via layer caching (package metadata copied first)
# - Optional production-like target (vite preview)
#
# Targets:
# - dev  : Vite dev server + HMR (port 5173)
# - prod : Production build served via `vite preview` (port 4173)

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm AS base

WORKDIR /app

FROM base AS deps

# Copy package metadata first to maximize Docker cache hits.
COPY package*.json ./

# Deterministic install based on lockfile.
RUN npm ci --no-audit --no-fund

FROM base AS dev

# Reuse deps from the deps stage to avoid reinstalling.
COPY --from=deps /app/node_modules /app/node_modules

# Copy app sources (in compose we also bind mount for live reload).
COPY . .

EXPOSE 5173

# Bind to 0.0.0.0 so the host can access the container port.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# -----------------------------------------------------------------------------
# Optional production-like target (parity checks / CI)
# -----------------------------------------------------------------------------

FROM base AS build

ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

RUN npm run build

FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY package*.json ./
COPY vite.config.* ./

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
