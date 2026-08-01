import { Controller, Get, Query, Req } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import type { PermissionRequest } from '../../../../../core/auth/permission-request';
import { toPaginatedHTTP } from '../../../../../core/pagination/to-paginated-http';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { ListAgendamentosUseCase } from '../../../application/use-cases/list-agendamentos';
import { listAgendamentosQuerySchema } from '../../../dto/list-agendamentos-query.schema';
import type { ListAgendamentosQuery } from '../../../dto/list-agendamentos-query.schema';
import { AgendamentoPresenter } from '../presenters/agendamento-presenter';

@Controller('agendamentos')
export class ListAgendamentosController {
  constructor(
    private readonly listAgendamentosUseCase: ListAgendamentosUseCase,
  ) {}

  @Get()
  @RequirePermission('agendamento', 'read')
  async findMany(
    @Req() req: PermissionRequest,
    @Query(new ZodValidationPipe(listAgendamentosQuerySchema))
    query: ListAgendamentosQuery,
  ) {
    const result = await this.listAgendamentosUseCase.execute({
      caller: req.callerMember!,
      data: query.data,
      profissionalId: query.profissionalId,
      page: query.page,
      perPage: query.perPage,
    });

    return toPaginatedHTTP({
      ...result,
      items: result.items.map((agendamento) =>
        AgendamentoPresenter.toHTTP(agendamento),
      ),
    });
  }
}
