# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

# Install workspace deps (backend only) using the root lockfile.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --filter @cleanarr/backend... --frozen-lockfile

COPY packages/backend ./packages/backend
# Generate the Prisma client (for type-checking), build, and prune to prod deps.
# `pnpm deploy` rebuilds node_modules from the store, which drops the generated
# Prisma client — so regenerate it inside the deployed directory afterwards.
RUN pnpm --filter @cleanarr/backend prisma:generate && \
    pnpm --filter @cleanarr/backend build && \
    pnpm --filter @cleanarr/backend deploy --legacy --prod /app/deploy && \
    cp -r packages/backend/prisma /app/deploy/prisma && \
    cd /app/deploy && ./node_modules/.bin/prisma generate

# ---- Runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY packages/backend/docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000
# Derive DATABASE_URL (if unset), apply migrations, then start the API.
CMD ["sh", "./docker-entrypoint.sh"]
