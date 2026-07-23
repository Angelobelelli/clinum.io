# Clinum

SaaS multi-tenant para gestão de clínicas, estética e studios de beleza.

> Estado atual: **esqueleto de infraestrutura**. Nenhuma funcionalidade de
> negócio (agenda, autenticação, multi-tenant de fato) foi implementada ainda —
> este repositório contém apenas a base sobre a qual os módulos serão
> construídos.

## Arquitetura, em poucas linhas

- **Monólito modular multi-tenant**: uma única aplicação backend (NestJS)
  atende todos os tenants (clínicas/estéticas/studios), isolando os dados de
  cada um via um mecanismo de tenant a ser definido em `apps/api/src/core/tenant`.
  Não é microsserviços — é um monólito organizado internamente por
  **bounded contexts** (`apps/api/src/modules/*`), o que permite extrair um
  módulo para um serviço próprio no futuro, se necessário.
- **`apps/api/src/core`** concentra infraestrutura transversal (tenant, auth,
  acesso a banco, filas) da qual os módulos de negócio dependem.
- **`apps/api/src/modules`** concentra as regras de negócio, um bounded
  context por pasta (ex: agenda, financeiro, fiscal, convênios).
- **`apps/api/src/integrations`** isola SDKs/clients de serviços externos
  (Google Calendar, WhatsApp, Pix, nota fiscal) atrás de adapters.
- **Frontend (`apps/web`, Next.js App Router)** é dividido em dois grupos de
  rotas: `(painel)` — área logada de quem administra a clínica — e
  `(publico)` — portal público, incluindo autoagendamento do cliente final.
- **`packages/shared-types`** guarda tipos TypeScript usados tanto pela API
  quanto pelo Web, evitando duplicação de contratos.
- **`packages/config`** guarda configuração compartilhada de ESLint,
  Prettier e TypeScript.

## Stack

| Camada         | Tecnologia                         |
| -------------- | ---------------------------------- |
| Monorepo       | Turborepo + pnpm workspaces        |
| Backend        | NestJS (TypeScript)                |
| Frontend       | Next.js (App Router, Tailwind CSS) |
| Banco de dados | PostgreSQL                         |
| Cache/fila     | Redis                              |
| ORM            | Prisma                             |

## Estrutura do repositório

```
clinum.io/
├── .github/
│   ├── workflows/            # ci.yml, deploy-staging.yml, deploy-production.yml
│   └── pull_request_template.md
├── apps/
│   ├── api/                 # NestJS
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── core/         # tenant, auth, database, queue (infra)
│   │       ├── modules/      # agenda, financeiro, fiscal, convenios... (negócio)
│   │       └── integrations/ # google-calendar, whatsapp, pix, nota-fiscal
│   └── web/                  # Next.js App Router
│       ├── Dockerfile
│       └── app/
│           ├── (painel)/     # área logada
│           └── (publico)/    # área pública / autoagendamento
├── packages/
│   ├── shared-types/         # tipos TS compartilhados
│   └── config/                # ESLint, Prettier, tsconfig compartilhados
├── docker-compose.yml         # Postgres + Redis (ambiente local)
├── CONTRIBUTING.md            # branches, commits, branch protection
└── turbo.json
```

## Como subir o ambiente local

### Pré-requisitos

- Node.js >= 20
- pnpm (`corepack enable` já habilita a versão fixada em `package.json`)
- Docker + Docker Compose

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Ajuste os valores se necessário (usuário/senha do Postgres, portas, etc.).
Os placeholders padrão funcionam para desenvolvimento local sem alteração.

### 2. Subir Postgres e Redis

```bash
docker compose up -d
```

Isso sobe:

- PostgreSQL na porta `5432` (dados persistidos no volume `clinum_postgres_data`)
- Redis na porta `6379` (dados persistidos no volume `clinum_redis_data`)

### 3. Instalar dependências

```bash
pnpm install
```

### 4. Gerar o client do Prisma

```bash
pnpm --filter @clinum/api prisma:generate
```

> O schema do Prisma (`apps/api/prisma/schema.prisma`) ainda não tem nenhum
> model — apenas a configuração de datasource. `prisma migrate dev` só fará
> sentido a partir do momento em que os primeiros models forem adicionados.

### 5. Rodar api e web

Em dois terminais (ou usando `pnpm dev` na raiz, que sobe tudo em paralelo via Turborepo):

```bash
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

### Scripts úteis na raiz

```bash
pnpm build     # build de todos os apps/pacotes (via Turborepo)
pnpm lint      # lint de todos os apps/pacotes
pnpm test      # testes de todos os apps/pacotes
pnpm format    # formata o repositório inteiro com Prettier
```

## Qualidade de código

- **ESLint + Prettier**: cada app usa sua própria config de ESLint (a
  oficial do NestJS/Next.js), com as regras de formatação delegadas ao
  Prettier compartilhado em `packages/config/prettier`.
- **Husky + lint-staged**: no pre-commit, os arquivos staged são
  formatados/lintados automaticamente (`.husky/pre-commit`).
- **Commitlint (Conventional Commits)**: mensagens de commit são validadas
  no hook `commit-msg` e devem seguir o formato `tipo: descrição`, por
  exemplo `feat: adiciona agenda de horários`, `fix: corrige cálculo de
comissão`, `chore: atualiza dependências`.

## Fluxo de contribuição

```
branch (feat/fix/refactor/chore, a partir de staging)
  → Pull Request para staging
  → CI (lint, testes, build, isolamento multi-tenant)
  → merge em staging
  → deploy automático em staging
  → testar em staging
  → Pull Request de staging para main
  → CI de novo + 1 aprovação de review
  → merge em main
  → aprovação manual (environment "production")
  → deploy em produção
```

Detalhes de branch protection, convenção de nomes de branch e Conventional
Commits estão em [`CONTRIBUTING.md`](./CONTRIBUTING.md). O pipeline de CI/CD
em si vive em `.github/workflows/`:

- **`ci.yml`** — roda em todo PR para `staging`/`main`: lint, testes, build
  (com cache do Turborepo entre execuções) e o job obrigatório
  `tenant-isolation`.
- **`deploy-staging.yml`** — builda as imagens Docker de `api`/`web`, faz
  push para o GitHub Container Registry e faz deploy via SSH, rodando
  `prisma migrate deploy` como parte do processo. Automático a cada merge
  em `staging`.
- **`deploy-production.yml`** — mesma lógica do staging, mas só executa
  após aprovação manual num GitHub Environment chamado `production`.

## O que ainda precisa da sua atenção

- `.env`: os placeholders em `.env.example` são seguros para uso local, mas
  troque `POSTGRES_PASSWORD` (e o restante da `DATABASE_URL`) antes de usar
  em qualquer ambiente compartilhado.
- Nenhum segredo de produção, domínio, ou credencial de integração externa
  (Google, WhatsApp, Pix, nota fiscal) foi configurado — isso é esperado
  neste estágio, mas precisará ser definido por você quando essas
  integrações forem implementadas.
- Os workflows de deploy referenciam secrets do GitHub Actions
  (`STAGING_SSH_HOST`/`USER`/`KEY`, `PRODUCTION_SSH_HOST`/`USER`/`KEY`) e um
  Environment `production` com reviewers obrigatórios — nenhum dos dois é
  criado por código, você precisa cadastrar manualmente (ver
  `CONTRIBUTING.md`).
- O servidor de staging/produção em si (docker-compose de produção, Caddy,
  etc.) ainda não existe — os workflows de deploy assumem que ele estará em
  `/opt/clinum/staging` e `/opt/clinum/production`, mas isso é assunto de
  outro momento.
