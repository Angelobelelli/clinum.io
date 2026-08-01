import { Controller, Delete, Param } from '@nestjs/common';
import { RequirePermission } from '../../../../../core/auth/permission.decorator';
import { DeletePatientUseCase } from '../../../application/use-cases/delete-patient';
import { patientErrorToHttpException } from '../patient-error-mapper';

@Controller('patients')
export class DeletePatientController {
  constructor(private readonly deletePatientUseCase: DeletePatientUseCase) {}

  @Delete(':patientId')
  @RequirePermission('patient', 'delete')
  async remove(@Param('patientId') patientId: string) {
    const result = await this.deletePatientUseCase.execute({ patientId });

    if (result.isLeft()) {
      throw patientErrorToHttpException(result.value);
    }
  }
}
