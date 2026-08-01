import { Body, Controller, Param, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import type { PermissionRequest } from '../../../../../core/auth/permission-request';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { UpdateAgendamentoStatusUseCase } from '../../../application/use-cases/update-agendamento-status';
import { updateAgendamentoStatusSchema } from '../../../dto/update-agendamento-status.schema';
import type { UpdateAgendamentoStatusInput } from '../../../dto/update-agendamento-status.schema';
import { agendamentoErrorToHttpException } from '../agendamento-error-mapper';
import { AgendamentoPresenter } from '../presenters/agendamento-presenter';

@Controller('agendamentos')
export class UpdateAgendamentoStatusController {
  constructor(
    private readonly updateAgendamentoStatusUseCase: UpdateAgendamentoStatusUseCase,
  ) {}

  @Patch(':id/status')
  @RequirePermission('agendamento', 'update_status')
  async updateStatus(
    @Req() req: PermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgendamentoStatusSchema))
    dto: UpdateAgendamentoStatusInput,
  ) {
    const result = await this.updateAgendamentoStatusUseCase.execute({
      agendamentoId: id,
      caller: req.callerMember!,
      status: dto.status,
    });

    if (result.isLeft()) {
      throw agendamentoErrorToHttpException(result.value);
    }

    return AgendamentoPresenter.toHTTP(result.value.agendamento);
  }
}
