import { Module } from '@nestjs/common';
import { PatientHealthRecordsRepository } from './application/repositories/patient-health-records-repository';
import { PatientsRepository } from './application/repositories/patients-repository';
import { CreatePatientUseCase } from './application/use-cases/create-patient';
import { DeletePatientUseCase } from './application/use-cases/delete-patient';
import { GetHealthRecordUseCase } from './application/use-cases/get-health-record';
import { GetPatientUseCase } from './application/use-cases/get-patient';
import { ListPatientsUseCase } from './application/use-cases/list-patients';
import { UpdateHealthRecordUseCase } from './application/use-cases/update-health-record';
import { UpdatePatientUseCase } from './application/use-cases/update-patient';
import { PrismaPatientHealthRecordsRepository } from './infra/database/prisma-patient-health-records-repository';
import { PrismaPatientsRepository } from './infra/database/prisma-patients-repository';
import { CreatePatientController } from './infra/http/controllers/create-patient.controller';
import { DeletePatientController } from './infra/http/controllers/delete-patient.controller';
import { GetHealthRecordController } from './infra/http/controllers/get-health-record.controller';
import { GetPatientController } from './infra/http/controllers/get-patient.controller';
import { ListPatientsController } from './infra/http/controllers/list-patients.controller';
import { UpdateHealthRecordController } from './infra/http/controllers/update-health-record.controller';
import { UpdatePatientController } from './infra/http/controllers/update-patient.controller';

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
