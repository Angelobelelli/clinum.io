# Clinum API

API multi-tenant (NestJS) do Clinum. Este documento cobre a fundação de
tenant + autenticação; funcionalidades de negócio (agenda, financeiro, etc.)
ainda não existem.

## Arquitetura de tenant

- **Banco compartilhado**: toda tabela de negócio terá uma coluna
  `organizationId`. Nunca banco/schema separado por cliente.
- **Auth + tenant**: [better-auth](https://www.better-auth.com/), plugin
  `organization` (`apps/api/src/core/auth/auth.ts`). Cada empresa cliente é
  uma `Organization`. Papéis: `owner`, `admin`, `member` (padrão do plugin) +
  `staff` e `reception` (`apps/api/src/core/auth/access-control.ts`).
- **Identificação do tenant**: pelo header `Host` da requisição — subdomínio
  (`slug` da Organization) ou `customDomain`. Resolvido por
  `TenantMiddleware` (`apps/api/src/core/tenant/tenant.middleware.ts`) e
  guardado em `AsyncLocalStorage` (`tenant-context.ts`) para o resto do
  request. Em `NODE_ENV=development`, o header `X-Tenant-Slug` sobrepõe a
  resolução por Host (não há subdomínio real em localhost).
- **Isolamento em duas camadas** (ambas ativas, ver `Patient`/
  `PatientHealthRecord` como o exemplo real em produção):
  1. Aplicação — `apps/api/src/core/database/prisma-tenant.extension.ts`
     (Prisma Client Extension), injeta/filtra `organizationId`
     automaticamente.
  2. Banco — Row-Level Security do Postgres, ver seção abaixo.
     Tabelas de negócio são sempre acessadas via `tenantScopedPrismaClient`
     (`tenant-scoped-prisma-client.ts`) — nunca o `PrismaService`/`prismaClient`
     crus, que continuam servindo só as tabelas de auth/tenant (user, session,
     organization, member, etc.).
- **Revalidação**: `TenantMatchGuard`
  (`apps/api/src/core/tenant/tenant-match.guard.ts`), aplicado globalmente,
  garante que a `organizationId` ativa na sessão do better-auth bate com o
  tenant resolvido pelo domínio. Requisições sem sessão passam livres — esse
  guard não decide se uma rota exige login, só que sessão e domínio
  concordem quando existe sessão.

## Row-Level Security

Fonte da verdade das políticas: `apps/api/prisma/rls-policies.sql`
(comentado, com o padrão a replicar em cada tabela de negócio nova).

**Como é aplicado**: via Prisma Migration (raw SQL), não por um script
separado. Motivo: o projeto já usa `prisma migrate` como pipeline único de
schema, com histórico versionado em `prisma/migrations/` e aplicado em
produção via `prisma migrate deploy` (CI/CD). Um script à parte teria que
ser lembrado manualmente em cada ambiente novo e facilmente ficaria
dessincronizado do schema — a migration garante que RLS é aplicado sempre
que o schema é aplicado, no mesmo passo.

Ao alterar `rls-policies.sql`: crie uma nova migration e copie o SQL
atualizado para o `migration.sql` gerado, em vez de editar migrations já
aplicadas.

**Usuário Postgres restrito (`clinum_app`)**: o usuário `clinum`
(`POSTGRES_USER`, definido no `docker-compose.yml`) é superusuário do banco
(padrão da imagem oficial do Postgres) — superusuário SEMPRE ignora RLS,
mesmo com `FORCE ROW LEVEL SECURITY`. Por isso, tabelas de negócio (Patient,
etc.) são acessadas por um segundo role, `clinum_app`, sem `SUPERUSER`,
criado automaticamente por `docker-init/create-app-role.sh` (montado como
init script do container Postgres). `clinum` continua existindo e é usado
só para migrations/CLI (que precisam de DDL, privilégio que `clinum_app` não
tem) e para as tabelas de auth/tenant já existentes (ver nota abaixo sobre
"organization").

Se você já tinha o container Postgres rodando antes dessa mudança (volume
com dados), o init script não roda sozinho (só roda na primeira
inicialização, volume vazio). Aplique manualmente, sem perder nada:

```bash
docker exec -i clinum-postgres sh /docker-entrypoint-initdb.d/create-app-role.sh
```

**Exceção deliberada: a tabela `organization`**: a policy nela existe e é
válida, mas fica **inerte na prática** — ela continua sendo lida pela
conexão `clinum` (superuser/`DATABASE_URL`), porque `TenantMiddleware`
precisa resolver o tenant a partir do `Host` **antes** de qualquer
`app.current_organization_id` existir (problema de ovo-e-galinha). O
isolamento real de `organization` hoje é feito pelo `TenantMatchGuard`
(camada de aplicação), não por RLS. Não é um bug — é um limite conhecido
desse modelo, documentado em `rls-policies.sql`.

**`SET LOCAL`**: as políticas comparam `organizationId` com
`current_setting('app.current_organization_id', true)`. `prisma-tenant.extension.ts`
implementa isso via `client.$transaction([...])` (forma sequencial): a
mesma transação primeiro roda `set_config('app.current_organization_id',
<id>, true)` (equivalente a `SET LOCAL`) e só depois a query de negócio —
ambas garantidas na mesma conexão. Isso só tem efeito porque
`tenantScopedPrismaClient` conecta como `clinum_app` (não-superusuário).

## Variáveis de ambiente

Além das já existentes (`DATABASE_URL`, `REDIS_URL`, etc.), esta fundação
adiciona (ver `.env.example` na raiz do monorepo):

| Variável                                      | Descrição                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`                          | Chave de assinatura/criptografia do better-auth. Gere uma por ambiente com `pnpm exec better-auth secret` — nunca reuse a de dev em produção.                                                                |
| `BETTER_AUTH_URL`                             | URL pública da própria API.                                                                                                                                                                                  |
| `BETTER_AUTH_TRUSTED_ORIGINS`                 | Origens confiáveis adicionais, separadas por vírgula (suporta wildcard de subdomínio).                                                                                                                       |
| `POSTGRES_APP_USER` / `POSTGRES_APP_PASSWORD` | Credenciais do role Postgres restrito (`clinum_app`), usadas só por `docker-init/create-app-role.sh` na criação do role.                                                                                     |
| `APP_DATABASE_URL`                            | String de conexão do role restrito — usada por `tenantScopedPrismaClient` para as tabelas de negócio (Patient, etc.). `DATABASE_URL` continua sendo usado por migrations/CLI e pelas tabelas de auth/tenant. |

## Rodando localmente

```bash
# na raiz do monorepo
docker compose up -d          # sobe Postgres + Redis
pnpm --filter @clinum/api prisma:migrate   # aplica migrations (models do better-auth + RLS)
pnpm --filter @clinum/api dev              # sobe a API em http://localhost:3001
```

Regenerar o schema do better-auth depois de mudar `auth.ts` (novos campos,
plugins, roles):

```bash
pnpm --filter @clinum/api auth:generate
pnpm --filter @clinum/api prisma:generate
```

### Testando manualmente

```bash
# cria uma organization (rota de teste, sem validação de negócio ainda)
curl -X POST http://localhost:3001/organizations \
  -H "Content-Type: application/json" \
  -d '{"name":"Clínica Bem Estar","slug":"clinicabemestar"}'

# prova que TenantMiddleware + AsyncLocalStorage resolveram o tenant
curl http://localhost:3001/organizations/me \
  -H "X-Tenant-Slug: clinicabemestar"
```

### Testes

```bash
pnpm --filter @clinum/api test:e2e
# ou, só o teste de isolamento de tenant:
pnpm --filter @clinum/api test:tenant-isolation
```

`apps/api/test/tenant-isolation.e2e-spec.ts` cobre o cenário básico: sessão
autenticada da org-a acessando pelo domínio da org-b deve receber 403 do
`TenantMatchGuard`. Deve ser expandido para também testar vazamento de dados
assim que o primeiro model de negócio existir (ver comentário no topo do
arquivo).

---

## NestJS (boilerplate original)

Projeto gerado com o [Nest CLI](https://docs.nestjs.com/cli/overview).

```bash
# desenvolvimento
pnpm start:dev

# produção
pnpm build && pnpm start:prod

# testes
pnpm test
pnpm test:e2e
pnpm test:cov
```
