import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { paginationQuerySchema } from '../../../../../core/pagination/pagination-query.schema';
import type { PaginationQuery } from '../../../../../core/pagination/pagination-query.schema';
import { toPaginatedHTTP } from '../../../../../core/pagination/to-paginated-http';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { ListMembersUseCase } from '../../../application/use-cases/list-members';
import { MembersReadGuard } from '../../../members-read.guard';
import { MemberPresenter } from '../presenters/member-presenter';

@Controller('members')
@UseGuards(MembersReadGuard)
export class ListMembersController {
  constructor(private readonly listMembersUseCase: ListMembersUseCase) {}

  @Get()
  async findMany(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    const result = await this.listMembersUseCase.execute(query);

    return toPaginatedHTTP({
      ...result,
      items: result.items.map((member) => MemberPresenter.toHTTP(member)),
    });
  }
}
