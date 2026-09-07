# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG SCHEMAVAULTS_CLIENT_APP_ID
ARG SCHEMAVAULTS_API_SERVER_ID
ARG SCHEMAVAULTS_AUTH_SERVER_URL="https://auth.schemavaults.com"
ENV NODE_ENV=production
ENV SCHEMAVAULTS_APP_ENVIRONMENT=production
ENV SCHEMAVAULTS_CLIENT_APP_ID=${SCHEMAVAULTS_CLIENT_APP_ID}
ENV SCHEMAVAULTS_API_SERVER_ID=${SCHEMAVAULTS_API_SERVER_ID}
ENV SCHEMAVAULTS_AUTH_SERVER_URL=${SCHEMAVAULTS_AUTH_SERVER_URL}
ENV NEXT_STANDALONE_DOCKER_BUILD true
ENV NEXT_TELEMETRY_DISABLED 1
RUN bun run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SCHEMAVAULTS_APP_ENVIRONMENT=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
