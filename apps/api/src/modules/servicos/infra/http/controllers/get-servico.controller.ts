import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { GetServicoUseCase } from '@/modules/servicos/application/use-cases/get-servico';
import { servicoErrorToHttpException } from '@/modules/servicos/infra/http/servico-error-mapper';
import { ServicoPresenter } from '@/modules/servicos/infra/http/presenters/servico-presenter';

@Controller('servicos')
export class GetServicoController {
  constructor(private readonly getServicoUseCase: GetServicoUseCase) {}

  @Get(':servicoId')
  @RequirePermission('servico', 'read')
  async get(@Param('servicoId') servicoId: string) {
    const result = await this.getServicoUseCase.execute({ servicoId });

    if (result.isLeft()) {
      throw servicoErrorToHttpException(result.value);
    }

    return ServicoPresenter.toHTTP(result.value.servico);
  }
}
