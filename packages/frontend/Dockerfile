# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --filter @cleanarr/frontend... --frozen-lockfile

COPY packages/frontend ./packages/frontend
RUN pnpm --filter @cleanarr/frontend build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runner
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
