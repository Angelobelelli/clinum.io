import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { CreateOrganizationUseCase } from '@/modules/organizations/application/use-cases/create-organization';
import type { CreateOrganizationInput } from '@/modules/organizations/dto/create-organization.schema';
import { createOrganizationSchema } from '@/modules/organizations/dto/create-organization.schema';
import { OrganizationPresenter } from '@/modules/organizations/infra/http/presenters/organization-presenter';

/**
 * Rota de teste manual da fundação de tenant/auth — sem @RequirePermission
 * de propósito: criar uma organização é uma operação "pré-tenant", ainda
 * não existe nenhum Member para autorizar (ver exclusão desta rota em
 * TenantMiddleware, apps/api/src/app.module.ts). Não passa pelo endpoint
 * de signup do better-auth; serve só para popular dados de teste
 * rapidamente.
 */
@Controller('organizations')
export class CreateOrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createOrganizationSchema))
    dto: CreateOrganizationInput,
  ) {
    const { organization } = await this.createOrganizationUseCase.execute(dto);

    return OrganizationPresenter.toHTTP(organization);
  }
}
