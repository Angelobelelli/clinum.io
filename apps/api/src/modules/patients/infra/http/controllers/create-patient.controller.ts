import { Body, Controller, Post } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { CreatePatientUseCase } from '@/modules/patients/application/use-cases/create-patient';
import { createPatientSchema } from '@/modules/patients/dto/create-patient.schema';
import type { CreatePatientInput } from '@/modules/patients/dto/create-patient.schema';
import { PatientPresenter } from '@/modules/patients/infra/http/presenters/patient-presenter';

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
