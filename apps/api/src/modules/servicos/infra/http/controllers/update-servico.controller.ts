import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { GetServicoUseCase } from '@/modules/servicos/application/use-cases/get-servico';
import { UpdateServicoUseCase } from '@/modules/servicos/application/use-cases/update-servico';
import { updateServicoSchema } from '@/modules/servicos/dto/update-servico.schema';
import type { UpdateServicoInput } from '@/modules/servicos/dto/update-servico.schema';
import { servicoErrorToHttpException } from '@/modules/servicos/infra/http/servico-error-mapper';
import { ServicoPresenter } from '@/modules/servicos/infra/http/presenters/servico-presenter';

@Controller('servicos')
export class UpdateServicoController {
  constructor(
    private readonly updateServicoUseCase: UpdateServicoUseCase,
    private readonly getServicoUseCase: GetServicoUseCase,
  ) {}

  @Patch(':servicoId')
  @RequirePermission('servico', 'update')
  async update(
    @Param('servicoId') servicoId: string,
    @Body(new ZodValidationPipe(updateServicoSchema))
    dto: UpdateServicoInput,
  ) {
    const result = await this.updateServicoUseCase.execute({
      servicoId,
      ...dto,
    });

    if (result.isLeft()) {
      throw servicoErrorToHttpException(result.value);
    }

    // UpdateServicoUseCase não retorna a entidade (Either<..., null>) — busca
    // de novo pra devolver o recurso atualizado, sem mudar o contrato do
    // use-case existente.
    const updated = await this.getServicoUseCase.execute({ servicoId });

    if (updated.isLeft()) {
      throw servicoErrorToHttpException(updated.value);
    }

    return ServicoPresenter.toHTTP(updated.value.servico);
  }
}
