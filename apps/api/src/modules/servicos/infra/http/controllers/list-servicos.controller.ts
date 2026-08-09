import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { paginationQuerySchema } from '@/core/pagination/pagination-query.schema';
import type { PaginationQuery } from '@/core/pagination/pagination-query.schema';
import { toPaginatedHTTP } from '@/core/pagination/to-paginated-http';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { ListServicosUseCase } from '@/modules/servicos/application/use-cases/list-servicos';
import { ServicoPresenter } from '@/modules/servicos/infra/http/presenters/servico-presenter';

@Controller('servicos')
export class ListServicosController {
  constructor(private readonly listServicosUseCase: ListServicosUseCase) {}

  @Get()
  @RequirePermission('servico', 'read')
  async findMany(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    const result = await this.listServicosUseCase.execute(query);

    return toPaginatedHTTP({
      ...result,
      items: result.items.map((servico) => ServicoPresenter.toHTTP(servico)),
    });
  }
}
