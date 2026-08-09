import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@/infra/database/prisma.service';
import { TenantScopedPrismaService } from '@/infra/database/tenant-scoped-prisma.service';

/**
 * Global para que PrismaService (tabelas de auth/tenant) e
 * TenantScopedPrismaService (tabelas de negócio, isolamento de tenant real)
 * fiquem disponíveis em qualquer módulo sem precisar reimportar
 * DatabaseModule toda vez.
 */
@Global()
@Module({
  providers: [PrismaService, TenantScopedPrismaService],
  exports: [PrismaService, TenantScopedPrismaService],
})
export class DatabaseModule {}
