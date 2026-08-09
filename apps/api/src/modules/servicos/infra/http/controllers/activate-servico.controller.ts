import { Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ActivateServicoUseCase } from '@/modules/servicos/application/use-cases/activate-servico';
import { GetServicoUseCase } from '@/modules/servicos/application/use-cases/get-servico';
import { servicoErrorToHttpException } from '@/modules/servicos/infra/http/servico-error-mapper';
import { ServicoPresenter } from '@/modules/servicos/infra/http/presenters/servico-presenter';

@Controller('servicos')
export class ActivateServicoController {
  constructor(
    private readonly activateServicoUseCase: ActivateServicoUseCase,
    private readonly getServicoUseCase: GetServicoUseCase,
  ) {}

  @Patch(':servicoId/ativar')
  @RequirePermission('servico', 'activate')
  async activate(@Param('servicoId') servicoId: string) {
    const result = await this.activateServicoUseCase.execute({ servicoId });

    if (result.isLeft()) {
      throw servicoErrorToHttpException(result.value);
    }

    const updated = await this.getServicoUseCase.execute({ servicoId });

    if (updated.isLeft()) {
      throw servicoErrorToHttpException(updated.value);
    }

    return ServicoPresenter.toHTTP(updated.value.servico);
  }
}
