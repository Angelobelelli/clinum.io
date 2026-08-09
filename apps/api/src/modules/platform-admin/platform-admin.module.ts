import { Module } from '@nestjs/common';
import { OrganizationsRepository } from '@/modules/platform-admin/application/repositories/organizations-repository';
import { ListOrganizationsUseCase } from '@/modules/platform-admin/application/use-cases/list-organizations';
import { PlatformAdminAuditInterceptor } from '@/modules/platform-admin/audit-log/platform-admin-audit.interceptor';
import { PrismaOrganizationsRepository } from '@/modules/platform-admin/infra/database/prisma-organizations-repository';
import { ListOrganizationsController } from '@/modules/platform-admin/infra/http/controllers/list-organizations.controller';
import { PlatformAdminGuard } from '@/modules/platform-admin/platform-admin.guard';

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
