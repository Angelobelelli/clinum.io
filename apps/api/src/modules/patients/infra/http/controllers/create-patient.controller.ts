import { Body, Controller, Post } from '@nestjs/common';
import { RequirePermission } from '../../../../../infra/auth/permission.decorator';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { CreatePatientUseCase } from '../../../application/use-cases/create-patient';
import { createPatientSchema } from '../../../dto/create-patient.schema';
import type { CreatePatientInput } from '../../../dto/create-patient.schema';
import { PatientPresenter } from '../presenters/patient-presenter';

@Controller('patients')
export class CreatePatientController {
  constructor(private readonly createPatientUseCase: CreatePatientUseCase) {}

  @Post()
  @RequirePermission('patient', 'create')
  async create(
    @Body(new ZodValidationPipe(createPatientSchema))
    dto: CreatePatientInput,
  ) {
    const { patient } = await this.createPatientUseCase.execute(dto);

    return PatientPresenter.toHTTP(patient);
  }
}
