import { Body, Controller, Param, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import type { PermissionRequest } from '../../../../../core/auth/permission-request';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { RevertAgendamentoUseCase } from '../../../application/use-cases/revert-agendamento';
import { reverterAgendamentoSchema } from '../../../dto/reverter-agendamento.schema';
import type { ReverterAgendamentoInput } from '../../../dto/reverter-agendamento.schema';
import { agendamentoErrorToHttpException } from '../agendamento-error-mapper';
import { AgendamentoPresenter } from '../presenters/agendamento-presenter';

@Controller('agendamentos')
export class RevertAgendamentoController {
  constructor(
    private readonly revertAgendamentoUseCase: RevertAgendamentoUseCase,
  ) {}

  @Patch(':id/reverter')
  @RequirePermission('agendamento', 'revert')
  async reverter(
    @Req() req: PermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reverterAgendamentoSchema))
    dto: ReverterAgendamentoInput,
  ) {
    const caller = req.callerMember!;
    const result = await this.revertAgendamentoUseCase.execute({
      agendamentoId: id,
      caller,
      adminUserId: caller.userId,
      novoStatus: dto.novoStatus,
      motivo: dto.motivo,
    });

    if (result.isLeft()) {
      throw agendamentoErrorToHttpException(result.value);
    }

    return AgendamentoPresenter.toHTTP(result.value.agendamento);
  }
}
