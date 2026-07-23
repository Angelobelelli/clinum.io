# syntax=docker/dockerfile:1
#
# Clinum API (NestJS) - imagem de produção.
#
# Usa o padrão oficial do Turborepo (`turbo prune`) para extrair só o
# subconjunto do monorepo necessário para @clinum/api, mantendo o build
# reprodutível mesmo com pnpm workspaces. Build a partir da RAIZ do repo:
#   docker build -f apps/api/Dockerfile -t clinum-api .

FROM node:20-alpine AS base

# ---- 1. Prune: extrai apenas os arquivos que @clinum/api precisa ----------
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @clinum/api --docker

# ---- 2. Install + build -----------------------------------------------------
FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install -g pnpm

# Instala dependências a partir dos package.json podados (cache-friendly)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copia o código-fonte podado e builda
COPY --from=builder /app/out/full/ .
RUN npm install -g turbo
RUN turbo run build --filter=@clinum/api...

# Prisma Client precisa ser gerado após o install. `DATABASE_URL` aqui é só
# um valor fictício exigido pelo parser do schema — a conexão real só
# acontece em runtime, via a env var de verdade injetada no container.
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
    pnpm --filter=@clinum/api exec prisma generate

# ---- 3. Runtime --------------------------------------------------------------
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=installer --chown=nestjs:nodejs /app .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
