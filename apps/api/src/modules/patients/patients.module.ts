import { Module } from '@nestjs/common';
import { PatientPermissionGuard } from './patient-permission.guard';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PatientPermissionGuard],
})
export class PatientsModule {}
