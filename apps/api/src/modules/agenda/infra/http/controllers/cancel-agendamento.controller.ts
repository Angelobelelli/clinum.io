import { Controller, Param, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import type { PermissionRequest } from '@/infra/auth/permission-request';
import { CancelAgendamentoUseCase } from '@/modules/agenda/application/use-cases/cancel-agendamento';
import { agendamentoErrorToHttpException } from '@/modules/agenda/infra/http/agendamento-error-mapper';
import { AgendamentoPresenter } from '@/modules/agenda/infra/http/presenters/agendamento-presenter';

@Controller('agendamentos')
export class CancelAgendamentoController {
  constructor(
    private readonly cancelAgendamentoUseCase: CancelAgendamentoUseCase,
  ) {}

  @Patch(':id/cancelar')
  @RequirePermission('agendamento', 'cancel')
  async cancelar(@Req() req: PermissionRequest, @Param('id') id: string) {
    const result = await this.cancelAgendamentoUseCase.execute({
      agendamentoId: id,
      caller: req.callerMember!,
    });

    if (result.isLeft()) {
      throw agendamentoErrorToHttpException(result.value);
    }

    return AgendamentoPresenter.toHTTP(result.value.agendamento);
  }
}
