# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

# Install workspace deps (backend only) using the root lockfile.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --filter @cleanarr/backend... --frozen-lockfile

COPY packages/backend ./packages/backend
RUN pnpm --filter @cleanarr/backend build && \
    pnpm --filter @cleanarr/backend deploy --prod /app/deploy

# ---- Runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
