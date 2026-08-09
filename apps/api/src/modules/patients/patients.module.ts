import { Module } from '@nestjs/common';
import { PatientHealthRecordsRepository } from '@/modules/patients/application/repositories/patient-health-records-repository';
import { PatientsRepository } from '@/modules/patients/application/repositories/patients-repository';
import { CreatePatientUseCase } from '@/modules/patients/application/use-cases/create-patient';
import { DeletePatientUseCase } from '@/modules/patients/application/use-cases/delete-patient';
import { GetHealthRecordUseCase } from '@/modules/patients/application/use-cases/get-health-record';
import { GetPatientUseCase } from '@/modules/patients/application/use-cases/get-patient';
import { ListPatientsUseCase } from '@/modules/patients/application/use-cases/list-patients';
import { UpdateHealthRecordUseCase } from '@/modules/patients/application/use-cases/update-health-record';
import { UpdatePatientUseCase } from '@/modules/patients/application/use-cases/update-patient';
import { PrismaPatientHealthRecordsRepository } from '@/modules/patients/infra/database/prisma-patient-health-records-repository';
import { PrismaPatientsRepository } from '@/modules/patients/infra/database/prisma-patients-repository';
import { CreatePatientController } from '@/modules/patients/infra/http/controllers/create-patient.controller';
import { DeletePatientController } from '@/modules/patients/infra/http/controllers/delete-patient.controller';
import { GetHealthRecordController } from '@/modules/patients/infra/http/controllers/get-health-record.controller';
import { GetPatientController } from '@/modules/patients/infra/http/controllers/get-patient.controller';
import { ListPatientsController } from '@/modules/patients/infra/http/controllers/list-patients.controller';
import { UpdateHealthRecordController } from '@/modules/patients/infra/http/controllers/update-health-record.controller';
import { UpdatePatientController } from '@/modules/patients/infra/http/controllers/update-patient.controller';

@Module({
  controllers: [
    CreatePatientController,
    ListPatientsController,
    GetPatientController,
    UpdatePatientController,
    DeletePatientController,
    GetHealthRecordController,
    UpdateHealthRecordController,
  ],
  providers: [
    { provide: PatientsRepository, useClass: PrismaPatientsRepository },
    {
      provide: PatientHealthRecordsRepository,
      useClass: PrismaPatientHealthRecordsRepository,
    },
    CreatePatientUseCase,
    ListPatientsUseCase,
    GetPatientUseCase,
    UpdatePatientUseCase,
    DeletePatientUseCase,
    GetHealthRecordUseCase,
    UpdateHealthRecordUseCase,
  ],
  // PatientsRepository exportado para outros módulos que precisam validar
  // um patientId (ex: agenda, ver AgendaModule) sem duplicar o binding.
  exports: [PatientsRepository],
})
export class PatientsModule {}
