import { Body, Controller, Post } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';
import { CreateServicoUseCase } from '@/modules/servicos/application/use-cases/create-servico';
import { createServicoSchema } from '@/modules/servicos/dto/create-servico.schema';
import type { CreateServicoInput } from '@/modules/servicos/dto/create-servico.schema';
import { ServicoPresenter } from '@/modules/servicos/infra/http/presenters/servico-presenter';

@Controller('servicos')
export class CreateServicoController {
  constructor(private readonly createServicoUseCase: CreateServicoUseCase) {}

  @Post()
  @RequirePermission('servico', 'create')
  async create(
    @Body(new ZodValidationPipe(createServicoSchema))
    dto: CreateServicoInput,
  ) {
    const organizationId = getCurrentTenantId();
    const { servico } = await this.createServicoUseCase.execute({
      organizationId,
      ...dto,
    });

    return ServicoPresenter.toHTTP(servico);
  }
}
