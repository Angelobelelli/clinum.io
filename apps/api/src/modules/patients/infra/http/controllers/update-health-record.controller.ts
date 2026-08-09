import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { UpdateHealthRecordUseCase } from '@/modules/patients/application/use-cases/update-health-record';
import { upsertHealthRecordSchema } from '@/modules/patients/dto/upsert-health-record.schema';
import type { UpsertHealthRecordInput } from '@/modules/patients/dto/upsert-health-record.schema';
import { patientErrorToHttpException } from '@/modules/patients/infra/http/patient-error-mapper';
import { PatientHealthRecordPresenter } from '@/modules/patients/infra/http/presenters/patient-health-record-presenter';

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
