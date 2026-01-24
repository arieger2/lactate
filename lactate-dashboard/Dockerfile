FROM node:20-alpine AS base

# Build: v1.0.1 - Test ghcr.io workflow
# OCI Labels für ghcr.io - verknüpft Image mit GitHub Repository
LABEL org.opencontainers.image.source="https://github.com/arieger2/lactate"
LABEL org.opencontainers.image.description="Lactate Dashboard - Scientific lactate diagnostics for endurance athletes"
LABEL org.opencontainers.image.licenses="MIT"

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create config directory and copy config
RUN mkdir -p /app/config

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/config ./config
COPY --from=builder /app/db ./db

# Create directories for runtime data
RUN mkdir -p /app/config /app/backups && \
    chown -R nextjs:nodejs /app/config /app/backups

# Install wget for healthcheck
RUN apk add --no-cache wget

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck für Container-Orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

CMD ["node", "server.js"]
