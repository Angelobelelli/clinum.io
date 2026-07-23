# Contribuindo com o Clinum

## Estratégia de branches (GitHub Flow simplificado)

```
main       → sempre estável, é o que está rodando em produção
staging    → homologação, onde o time valida antes de ir pra produção
feat/...   → branches de trabalho, nascem de staging
fix/...
refactor/...
chore/...
```

- `main` e `staging` nunca recebem commit direto — sempre via Pull Request.
- Toda branch de trabalho nasce de `staging`, nunca de `main`.
- Prefixo da branch indica a natureza da mudança:
  - `feat/` — nova funcionalidade (ex: `feat/agenda-recorrente`)
  - `fix/` — correção de bug (ex: `fix/calculo-comissao`)
  - `refactor/` — mudança de código sem alterar comportamento observável
  - `chore/` — manutenção: dependências, configs, CI, etc.

## Conventional Commits

Mensagens de commit são validadas pelo Commitlint (hook `commit-msg` do
Husky, configurado em `commitlint.config.js`) e devem seguir
[Conventional Commits](https://www.conventionalcommits.org/):

```
tipo: descrição curta no imperativo

feat: adiciona agenda de horários
fix: corrige cálculo de comissão do profissional
refactor: extrai regra de disponibilidade para service próprio
chore: atualiza dependências do Nest
```

Tipos aceitos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`,
`perf`, `build`, `ci`, `revert` (padrão de
`@commitlint/config-conventional`).

## Branch protection (configurar manualmente em Settings > Branches)

Este repositório não configura branch protection via API — configure
manualmente em **Settings > Branches > Branch protection rules** do
GitHub:

### `main`

- ✅ Require a pull request before merging
- ✅ Require approvals — mínimo **1** review antes do merge
- ✅ Require status checks to pass before merging — marque o job/workflow
  `CI` (`.github/workflows/ci.yml`) como obrigatório
- ✅ Require branches to be up to date before merging (recomendado)
- ✅ Do not allow bypassing the above settings (recomendado, mesmo para admins)

### `staging`

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging — marque o job/workflow
  `CI` (`.github/workflows/ci.yml`) como obrigatório
- Não exige aprovação de review (fluxo mais leve, já que staging não afeta
  cliente real)

> O job `tenant-isolation` faz parte do workflow `CI` e é obrigatório em
> ambas as branches — ele garante que dado de um tenant nunca vaza para
> outro. Ver comentário no próprio `.github/workflows/ci.yml`.

## Environment "production" (aprovação manual de deploy)

O workflow `.github/workflows/deploy-production.yml` usa um GitHub
Environment chamado `production` para exigir aprovação manual antes de
qualquer deploy em produção. Configure em **Settings > Environments >
New environment**:

1. Nome: `production`
2. Marque **Required reviewers** e adicione quem pode aprovar deploys
   (dono do produto, tech lead, etc.)
3. Cadastre os secrets `PRODUCTION_SSH_HOST`, `PRODUCTION_SSH_USER` e
   `PRODUCTION_SSH_KEY` — no nível do repositório (Settings > Secrets and
   variables > Actions) ou escopados a este environment

## Fluxo de trabalho, do início ao fim

1. Crie uma branch a partir de `staging` com o prefixo correto
   (`feat/`, `fix/`, `refactor/`, `chore/`)
2. Abra um Pull Request contra `staging`
3. O workflow `CI` roda automaticamente (lint, testes, build,
   isolamento multi-tenant) — corrija o que for necessário até ficar verde
4. Após 0 aprovações obrigatórias (mas passando o CI) e o merge em
   `staging`, o deploy em staging acontece automaticamente
   (`deploy-staging.yml`)
5. Valide a mudança no ambiente de staging
6. Abra um Pull Request de `staging` para `main`
7. `CI` roda de novo contra `main`; é necessária **1 aprovação de review**
8. Após o merge em `main`, o deploy em produção fica pendente de
   aprovação manual no environment `production` — só depois disso ele
   roda de fato (`deploy-production.yml`)

Veja também a seção "Fluxo de contribuição" no `README.md` para um resumo
visual do mesmo processo.
