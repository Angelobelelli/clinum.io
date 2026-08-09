import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { paginationQuerySchema } from '../../../../../core/pagination/pagination-query.schema';
import type { PaginationQuery } from '../../../../../core/pagination/pagination-query.schema';
import { toPaginatedHTTP } from '../../../../../core/pagination/to-paginated-http';
import { SkipTenantMatch } from '../../../../../infra/tenant/skip-tenant-match.decorator';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { ListOrganizationsUseCase } from '../../../application/use-cases/list-organizations';
import { PlatformAdminAction } from '../../../audit-log/platform-admin-action.decorator';
import { PlatformAdminAuditInterceptor } from '../../../audit-log/platform-admin-audit.interceptor';
import { PlatformAdminGuard } from '../../../platform-admin.guard';
import { OrganizationPresenter } from '../presenters/organization-presenter';

/**
 * Painel de administração da PLATAFORMA (dono do SaaS) — cross-tenant por
 * definição, para fins de suporte/gestão. Ver mesmo comentário original em
 * platform-admin.controller.ts: este é o ÚNICO controller do sistema
 * autorizado a consultar dados de mais de uma Organization na mesma
 * requisição — não copie esse padrão para módulos de negócio.
 */
@SkipTenantMatch()
@UseGuards(PlatformAdminGuard)
@UseInterceptors(PlatformAdminAuditInterceptor)
@Controller('platform-admin')
export class ListOrganizationsController {
  constructor(
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
  ) {}

  @Get('organizations')
  @PlatformAdminAction('list_organizations')
  async listOrganizations(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    const result = await this.listOrganizationsUseCase.execute(query);

    return toPaginatedHTTP({
      ...result,
      items: result.items.map((organization) =>
        OrganizationPresenter.toHTTP(organization),
      ),
    });
  }
}
