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
- **Isolamento em duas camadas**:
  1. Aplicação — `apps/api/src/core/database/prisma-tenant.extension.ts`
     (Prisma Client Extension), pronta para uso mas sem models de negócio
     ainda.
  2. Banco — Row-Level Security do Postgres, ver seção abaixo.
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

**Nota sobre o ambiente local**: o usuário Postgres usado em
desenvolvimento (`clinum`, definido no `docker-compose.yml`) é superusuário
do banco (padrão da imagem oficial do Postgres para o usuário criado via
`POSTGRES_USER`). RLS nunca se aplica a superusuários — então, hoje, a
política existe e está correta, mas é inerte nas queries locais. Ela passa a
ter efeito real quando a aplicação passar a se conectar com um role
dedicado, não-superusuário, o que fica para quando houver dados de negócio
sensíveis o suficiente para justificar o role separado.

**Nota sobre `SET LOCAL`**: as políticas comparam `organizationId` com
`current_setting('app.current_organization_id', true)`. Isso exige que a
aplicação rode `SET LOCAL app.current_organization_id = '<id>'` na mesma
transação/conexão antes de cada query — ainda não implementado (a
Camada 1, em `prisma-tenant.extension.ts`, hoje é só em memória via
`getCurrentTenantId()`). Fica para quando a extension passar a abrir
transação por request de negócio.

## Variáveis de ambiente

Além das já existentes (`DATABASE_URL`, `REDIS_URL`, etc.), esta fundação
adiciona (ver `.env.example` na raiz do monorepo):

| Variável                      | Descrição                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`          | Chave de assinatura/criptografia do better-auth. Gere uma por ambiente com `pnpm exec better-auth secret` — nunca reuse a de dev em produção. |
| `BETTER_AUTH_URL`             | URL pública da própria API.                                                                                                                   |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Origens confiáveis adicionais, separadas por vírgula (suporta wildcard de subdomínio).                                                        |

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
