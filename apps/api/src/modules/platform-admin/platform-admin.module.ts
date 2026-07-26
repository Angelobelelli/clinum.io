import { Module } from '@nestjs/common';
import { PlatformAdminAuditInterceptor } from './audit-log/platform-admin-audit.interceptor';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  controllers: [PlatformAdminController],
  providers: [PlatformAdminGuard, PlatformAdminAuditInterceptor],
})
export class PlatformAdminModule {}
