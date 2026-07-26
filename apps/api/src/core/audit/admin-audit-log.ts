import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../generated/prisma/client';
import { prismaClient } from '../database/prisma-client';

export interface RecordAdminAuditLogInput {
  adminUserId: string;
  action: string;
  targetOrganizationId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Grava uma entrada em AdminAuditLog — a trilha de auditoria de ações da
 * administração da PLATAFORMA (cross-tenant), ver
 * apps/api/src/modules/platform-admin/.
 *
 * Usa `prismaClient` cru (não o client com isolamento de tenant) de
 * propósito: AdminAuditLog não pertence a nenhuma Organization, não tem
 * organizationId, e por isso nunca deve ser adicionado a
 * TENANT_SCOPED_MODELS em prisma-tenant.extension.ts.
 *
 * É chamada em dois pontos, hoje:
 *   1. PlatformAdminAuditInterceptor, para toda rota de platform-admin;
 *   2. o hook databaseHooks.session.create.after em auth.ts, quando a
 *      sessão criada é de impersonation (session.impersonatedBy setado
 *      pelo plugin `admin` do better-auth).
 */
export async function recordAdminAuditLog(
  input: RecordAdminAuditLogInput,
): Promise<void> {
  await prismaClient.adminAuditLog.create({
    data: {
      id: randomUUID(),
      adminUserId: input.adminUserId,
      action: input.action,
      targetOrganizationId: input.targetOrganizationId ?? null,
      targetUserId: input.targetUserId ?? null,
      metadata: (input.metadata ?? undefined) as
        Prisma.InputJsonValue | undefined,
    },
  });
}
