import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { tenantScopedPrismaClient } from '@/infra/database/tenant-scoped-prisma-client';

/**
 * Wrapper Nest do client Prisma tenant-scoped (isolamento de tenant +
 * conexão restrita, ver tenant-scoped-prisma-client.ts) — para uso em
 * services de dados de NEGÓCIO (Patient, futuros models).
 *
 * Nunca use isto para tabelas de auth/tenant (User, Session, Organization,
 * Member, etc.) — essas continuam em PrismaService (conexão superuser).
 */
@Injectable()
export class TenantScopedPrismaService
  implements OnModuleInit, OnModuleDestroy
{
  readonly db = tenantScopedPrismaClient;

  async onModuleInit(): Promise<void> {
    await this.db.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}
