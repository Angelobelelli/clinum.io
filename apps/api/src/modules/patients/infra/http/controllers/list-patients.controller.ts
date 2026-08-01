import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import { paginationQuerySchema } from '../../../../../core/pagination/pagination-query.schema';
import type { PaginationQuery } from '../../../../../core/pagination/pagination-query.schema';
import { toPaginatedHTTP } from '../../../../../core/pagination/to-paginated-http';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { ListPatientsUseCase } from '../../../application/use-cases/list-patients';
import { PatientPresenter } from '../presenters/patient-presenter';

@Controller('patients')
export class ListPatientsController {
  constructor(private readonly listPatientsUseCase: ListPatientsUseCase) {}

  @Get()
  @RequirePermission('patient', 'read')
  async findMany(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    const result = await this.listPatientsUseCase.execute(query);

    return toPaginatedHTTP({
      ...result,
      items: result.items.map((patient) =>
        PatientPresenter.toListItem(patient),
      ),
    });
  }
}
