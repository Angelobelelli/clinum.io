import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { SkipTenantMatch } from '../../core/tenant/skip-tenant-match.decorator';
import { PrismaService } from '../../core/database/prisma.service';
import { PlatformAdminAction } from './audit-log/platform-admin-action.decorator';
import { PlatformAdminAuditInterceptor } from './audit-log/platform-admin-audit.interceptor';
import { PlatformAdminGuard } from './platform-admin.guard';

/**
 * Painel de administração da PLATAFORMA (dono do SaaS) — cross-tenant por
 * definição, para fins de suporte/gestão.
 *
 * Este é o ÚNICO controller do sistema autorizado a consultar/alterar dados
 * de mais de uma Organization na mesma requisição. Qualquer módulo de
 * negócio (agenda, financeiro, etc.) que precise disso está, por
 * definição, violando o isolamento de tenant — não copie este padrão para
 * lá. Toda rota aqui exige PlatformAdminGuard (platformRole = super_admin)
 * e é isenta da revalidação de tenant normal (@SkipTenantMatch).
 */
@SkipTenantMatch()
@UseGuards(PlatformAdminGuard)
@UseInterceptors(PlatformAdminAuditInterceptor)
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('organizations')
  @PlatformAdminAction('list_organizations')
  listOrganizations() {
    return this.prisma.db.organization.findMany();
  }
}
