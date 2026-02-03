# Remote Debug Tools Docker Configuration
# Multi-stage build for smaller, more secure images

# ---- Build stage ----
FROM node:22.6.0 AS builder

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY sdk/package.json ./sdk/
COPY figma-plugin/package.json ./figma-plugin/

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate \
    && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build:all

# ---- Runtime stage ----
FROM node:22.6.0-slim AS runtime

# Playwright dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 appuser

WORKDIR /usr/src/app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=appuser:appuser /usr/src/app/dist ./dist
COPY --from=builder --chown=appuser:appuser /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /usr/src/app/package.json ./
COPY --from=builder --chown=appuser:appuser /usr/src/app/ecosystem.config.js ./
COPY --from=builder --chown=appuser:appuser /usr/src/app/devtools-frontend ./devtools-frontend
COPY --from=builder --chown=appuser:appuser /usr/src/app/client/dist ./client/dist
COPY --from=builder --chown=appuser:appuser /usr/src/app/sdk/dist ./sdk/dist
COPY --from=builder --chown=appuser:appuser /usr/src/app/assets ./assets

# Create data directories with proper ownership
RUN mkdir -p /app/data /app/logs && chown -R appuser:appuser /app

# Install Playwright browser
RUN npx playwright install chromium

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const http=require('http');const r=http.get('http://localhost:3001/',res=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

CMD ["npm", "run", "start:container"]
