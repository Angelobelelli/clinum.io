import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prismaClient } from './prisma-client';

/**
 * Wrapper Nest do client Prisma "cru" (sem isolamento de tenant), para uso em
 * providers que precisam de acesso direto ao banco — ex: TenantMiddleware
 * consultando a tabela Organization, que não é uma tabela de negócio e
 * portanto nunca deve passar pela prisma-tenant.extension.ts.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = prismaClient;

  async onModuleInit(): Promise<void> {
    await this.db.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}
