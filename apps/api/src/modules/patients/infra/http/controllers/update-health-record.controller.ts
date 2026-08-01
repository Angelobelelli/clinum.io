import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { UpdateHealthRecordUseCase } from '../../../application/use-cases/update-health-record';
import { upsertHealthRecordSchema } from '../../../dto/upsert-health-record.schema';
import type { UpsertHealthRecordInput } from '../../../dto/upsert-health-record.schema';
import { patientErrorToHttpException } from '../patient-error-mapper';
import { PatientHealthRecordPresenter } from '../presenters/patient-health-record-presenter';

@Controller('patients')
export class UpdateHealthRecordController {
  constructor(
    private readonly updateHealthRecordUseCase: UpdateHealthRecordUseCase,
  ) {}

  @Patch(':patientId/health-record')
  @RequirePermission('patient', 'update_health_record')
  async updateHealthRecord(
    @Param('patientId') patientId: string,
    @Body(new ZodValidationPipe(upsertHealthRecordSchema))
    dto: UpsertHealthRecordInput,
  ) {
    const result = await this.updateHealthRecordUseCase.execute({
      patientId,
      ...dto,
    });

    if (result.isLeft()) {
      throw patientErrorToHttpException(result.value);
    }

    return PatientHealthRecordPresenter.toHTTP(result.value.healthRecord);
  }
}
