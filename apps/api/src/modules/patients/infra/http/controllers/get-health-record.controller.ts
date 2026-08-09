import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '../../../../../infra/auth/permission.decorator';
import { GetHealthRecordUseCase } from '../../../application/use-cases/get-health-record';
import { patientErrorToHttpException } from '../patient-error-mapper';
import { PatientHealthRecordPresenter } from '../presenters/patient-health-record-presenter';

@Controller('patients')
export class GetHealthRecordController {
  constructor(
    private readonly getHealthRecordUseCase: GetHealthRecordUseCase,
  ) {}

  @Get(':patientId/health-record')
  @RequirePermission('patient', 'read_health_record')
  async findHealthRecord(@Param('patientId') patientId: string) {
    const result = await this.getHealthRecordUseCase.execute({ patientId });

    if (result.isLeft()) {
      throw patientErrorToHttpException(result.value);
    }

    return PatientHealthRecordPresenter.toHTTP(result.value.healthRecord);
  }
}
