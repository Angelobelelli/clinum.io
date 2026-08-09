import { Controller, Get, Query, Req } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import type { PermissionRequest } from '@/infra/auth/permission-request';
import { toPaginatedHTTP } from '@/core/pagination/to-paginated-http';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { ListAgendamentosUseCase } from '@/modules/agenda/application/use-cases/list-agendamentos';
import { listAgendamentosQuerySchema } from '@/modules/agenda/dto/list-agendamentos-query.schema';
import type { ListAgendamentosQuery } from '@/modules/agenda/dto/list-agendamentos-query.schema';
import { AgendamentoPresenter } from '@/modules/agenda/infra/http/presenters/agendamento-presenter';

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
