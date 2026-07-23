# syntax=docker/dockerfile:1
#
# Clinum Web (Next.js) - imagem de produção.
#
# Usa o padrão oficial do Turborepo (`turbo prune`) + o output "standalone"
# do Next.js (ver apps/web/next.config.ts) para gerar uma imagem enxuta.
# Build a partir da RAIZ do repo:
#   docker build -f apps/web/Dockerfile -t clinum-web .

FROM node:20-alpine AS base

# ---- 1. Prune: extrai apenas os arquivos que @clinum/web precisa ----------
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @clinum/web --docker

# ---- 2. Install + build -----------------------------------------------------
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN npm install -g turbo

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* precisa existir em build-time (fica embutida no bundle do
# cliente). Ajuste via --build-arg se a URL pública da API mudar por ambiente.
ARG NEXT_PUBLIC_API_URL="http://localhost:3001"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN turbo run build --filter=@clinum/web...

# ---- 3. Runtime --------------------------------------------------------------
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=installer /app/apps/web/next.config.ts .
COPY --from=installer /app/apps/web/package.json .

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
