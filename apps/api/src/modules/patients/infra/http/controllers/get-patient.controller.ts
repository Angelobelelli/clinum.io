import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '../../../../../infra/auth/permission.decorator';
import { GetPatientUseCase } from '../../../application/use-cases/get-patient';
import { patientErrorToHttpException } from '../patient-error-mapper';
import { PatientPresenter } from '../presenters/patient-presenter';

@Controller('patients')
export class GetPatientController {
  constructor(private readonly getPatientUseCase: GetPatientUseCase) {}

  @Get(':patientId')
  @RequirePermission('patient', 'read')
  async findOne(@Param('patientId') patientId: string) {
    const result = await this.getPatientUseCase.execute({ patientId });

    if (result.isLeft()) {
      throw patientErrorToHttpException(result.value);
    }

    return PatientPresenter.toHTTP(result.value.patient);
  }
}
