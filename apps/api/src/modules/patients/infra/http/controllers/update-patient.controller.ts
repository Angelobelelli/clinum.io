import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { UpdatePatientUseCase } from '@/modules/patients/application/use-cases/update-patient';
import { updatePatientSchema } from '@/modules/patients/dto/update-patient.schema';
import type { UpdatePatientInput } from '@/modules/patients/dto/update-patient.schema';
import { patientErrorToHttpException } from '@/modules/patients/infra/http/patient-error-mapper';
import { PatientPresenter } from '@/modules/patients/infra/http/presenters/patient-presenter';

@Controller('patients')
export class UpdatePatientController {
  constructor(private readonly updatePatientUseCase: UpdatePatientUseCase) {}

  @Patch(':patientId')
  @RequirePermission('patient', 'update')
  async update(
    @Param('patientId') patientId: string,
    @Body(new ZodValidationPipe(updatePatientSchema))
    dto: UpdatePatientInput,
  ) {
    const result = await this.updatePatientUseCase.execute({
      patientId,
      ...dto,
    });

    if (result.isLeft()) {
      throw patientErrorToHttpException(result.value);
    }

    return PatientPresenter.toHTTP(result.value.patient);
  }
}
