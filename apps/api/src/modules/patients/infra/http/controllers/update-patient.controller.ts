import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import { ZodValidationPipe } from '../../../../../core/validation/zod-validation.pipe';
import { UpdatePatientUseCase } from '../../../application/use-cases/update-patient';
import { updatePatientSchema } from '../../../dto/update-patient.schema';
import type { UpdatePatientInput } from '../../../dto/update-patient.schema';
import { patientErrorToHttpException } from '../patient-error-mapper';
import { PatientPresenter } from '../presenters/patient-presenter';

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
