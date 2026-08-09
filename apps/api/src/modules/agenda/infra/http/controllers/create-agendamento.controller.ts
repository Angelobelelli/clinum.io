import { Body, Controller, Post, Req } from '@nestjs/common';
import { RequirePermission } from '../../../../../infra/auth/permission.decorator';
import type { PermissionRequest } from '../../../../../infra/auth/permission-request';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { CreateAgendamentoUseCase } from '../../../application/use-cases/create-agendamento';
import { createAgendamentoSchema } from '../../../dto/create-agendamento.schema';
import type { CreateAgendamentoInput } from '../../../dto/create-agendamento.schema';
import { agendamentoErrorToHttpException } from '../agendamento-error-mapper';
import { AgendamentoPresenter } from '../presenters/agendamento-presenter';

@Controller('agendamentos')
export class CreateAgendamentoController {
  constructor(
    private readonly createAgendamentoUseCase: CreateAgendamentoUseCase,
  ) {}

  @Post()
  @RequirePermission('agendamento', 'create')
  async create(
    @Req() req: PermissionRequest,
    @Body(new ZodValidationPipe(createAgendamentoSchema))
    dto: CreateAgendamentoInput,
  ) {
    const result = await this.createAgendamentoUseCase.execute({
      ...dto,
      caller: req.callerMember!,
    });

    if (result.isLeft()) {
      throw agendamentoErrorToHttpException(result.value);
    }

    return AgendamentoPresenter.toHTTP(result.value.agendamento);
  }
}
