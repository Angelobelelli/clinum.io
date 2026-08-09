import { Body, Controller, Param, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import type { PermissionRequest } from '@/infra/auth/permission-request';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { UpdateAgendamentoStatusUseCase } from '@/modules/agenda/application/use-cases/update-agendamento-status';
import { updateAgendamentoStatusSchema } from '@/modules/agenda/dto/update-agendamento-status.schema';
import type { UpdateAgendamentoStatusInput } from '@/modules/agenda/dto/update-agendamento-status.schema';
import { agendamentoErrorToHttpException } from '@/modules/agenda/infra/http/agendamento-error-mapper';
import { AgendamentoPresenter } from '@/modules/agenda/infra/http/presenters/agendamento-presenter';

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
