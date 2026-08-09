# core

Kernel de domínio, agnóstico de framework/infra — nada aqui importa Nest,
Prisma ou better-auth. É o mesmo tipo de código que `enterprise/`/`application/`
de cada módulo de negócio (ver `src/modules/*`) reutilizam:

- **entities/** — `Entity`/`UniqueEntityID`, base para as entidades de domínio
  de cada módulo
- **either.ts** — `Either<L, R>`, usado nos use-cases para erros de negócio
  esperados
- **pagination/** — tipos/schema de paginação compartilhados
- **env/** — schema Zod de variáveis de ambiente, validado no carregamento do
  módulo

Infraestrutura transversal de verdade (Prisma, better-auth, resolução de
tenant, auditoria, filtro de exceção, pipes HTTP) vive em `src/infra/`, não
aqui — só entra em `core/` o que não depende de nenhum framework/driver.
