import { Body, Controller, Param, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '../../../../../infra/auth/permission.decorator';
import type { PermissionRequest } from '../../../../../infra/auth/permission-request';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { UpdateAgendamentoUseCase } from '../../../application/use-cases/update-agendamento';
import { updateAgendamentoSchema } from '../../../dto/update-agendamento.schema';
import type { UpdateAgendamentoInput } from '../../../dto/update-agendamento.schema';
import { agendamentoErrorToHttpException } from '../agendamento-error-mapper';
import { AgendamentoPresenter } from '../presenters/agendamento-presenter';

@Controller('agendamentos')
export class UpdateAgendamentoController {
  constructor(
    private readonly updateAgendamentoUseCase: UpdateAgendamentoUseCase,
  ) {}

  @Patch(':id')
  @RequirePermission('agendamento', 'update')
  async update(
    @Req() req: PermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgendamentoSchema))
    dto: UpdateAgendamentoInput,
  ) {
    const result = await this.updateAgendamentoUseCase.execute({
      agendamentoId: id,
      caller: req.callerMember!,
      ...dto,
    });

    if (result.isLeft()) {
      throw agendamentoErrorToHttpException(result.value);
    }

    return AgendamentoPresenter.toHTTP(result.value.agendamento);
  }
}
