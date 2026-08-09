import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { env } from '../../core/env/env';
import { prismaTenantExtension } from './prisma-tenant.extension';

/**
 * Client Prisma dedicado às tabelas de NEGÓCIO (Patient, PatientHealthRecord,
 * futuros models) — conecta como o role Postgres RESTRITO (sem SUPERUSER,
 * ver docker-init/create-app-role.sh + APP_DATABASE_URL no .env), necessário
 * pra Row-Level Security (prisma/rls-policies.sql) ter efeito de verdade.
 *
 * Diferente de `prismaClient` (prisma-client.ts), que continua conectando
 * como o usuário superuser (DATABASE_URL) e é usado pelas tabelas de
 * auth/tenant já existentes (user/session/organization/member/etc.) — o
 * TenantMiddleware precisa conseguir ler "organization" para resolver o
 * tenant ANTES de qualquer app.current_organization_id existir (problema de
 * ovo-e-galinha), então essas tabelas nunca poderiam depender de RLS por
 * essa variável de sessão.
 *
 * SEMPRE use este client (nunca o `prismaClient`/`PrismaService` crus) para
 * tudo que for Patient/PatientHealthRecord ou qualquer model futuro
 * adicionado a TENANT_SCOPED_MODELS — é ele que já vem com
 * prismaTenantExtension aplicada (isolamento por aplicação) e é a única
 * conexão que de fato respeita RLS no banco.
 */
const adapter = new PrismaPg({
  connectionString: env.APP_DATABASE_URL,
});

export const tenantScopedPrismaClient = new PrismaClient({ adapter }).$extends(
  prismaTenantExtension,
);
