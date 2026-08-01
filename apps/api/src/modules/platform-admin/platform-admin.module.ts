import { Module } from '@nestjs/common';
import { OrganizationsRepository } from './application/repositories/organizations-repository';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations';
import { PlatformAdminAuditInterceptor } from './audit-log/platform-admin-audit.interceptor';
import { PrismaOrganizationsRepository } from './infra/database/prisma-organizations-repository';
import { ListOrganizationsController } from './infra/http/controllers/list-organizations.controller';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  controllers: [ListOrganizationsController],
  providers: [
    PlatformAdminGuard,
    PlatformAdminAuditInterceptor,
    {
      provide: OrganizationsRepository,
      useClass: PrismaOrganizationsRepository,
    },
    ListOrganizationsUseCase,
  ],
})
export class PlatformAdminModule {}
