import { Controller, Get } from '@nestjs/common';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';
import { GetCurrentOrganizationUseCase } from '@/modules/organizations/application/use-cases/get-current-organization';
import { organizationErrorToHttpException } from '@/modules/organizations/infra/http/organization-error-mapper';
import { OrganizationPresenter } from '@/modules/organizations/infra/http/presenters/organization-presenter';

/**
 * Prova que TenantMiddleware + AsyncLocalStorage resolveram corretamente o
 * tenant a partir do Host (ou do header X-Tenant-Slug em dev).
 */
@Controller('organizations')
export class GetCurrentOrganizationController {
  constructor(
    private readonly getCurrentOrganizationUseCase: GetCurrentOrganizationUseCase,
  ) {}

  @Get('me')
  async me() {
    const organizationId = getCurrentTenantId();
    const result = await this.getCurrentOrganizationUseCase.execute({
      organizationId,
    });

    if (result.isLeft()) {
      throw organizationErrorToHttpException(result.value);
    }

    return OrganizationPresenter.toHTTP(result.value.organization);
  }
}
