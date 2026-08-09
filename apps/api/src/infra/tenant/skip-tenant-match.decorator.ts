import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_MATCH_KEY = 'skipTenantMatch';

/**
 * Marca uma rota (ou controller inteiro) como isenta da revalidação feita
 * por TenantMatchGuard — uso deliberado e restrito a rotas que, por
 * definição, são cross-tenant (ex: apps/api/src/modules/platform-admin/,
 * que também precisa estar fora de TenantMiddleware, ver app.module.ts).
 *
 * NÃO use isso para "resolver" um bug de tenant em uma rota de negócio
 * normal — isso reintroduziria exatamente o vazamento entre tenants que
 * TenantMatchGuard existe para prevenir.
 */
export const SkipTenantMatch = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_TENANT_MATCH_KEY, true);
