import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { createPatientSchema } from './dto/create-patient.schema';
import type { CreatePatientInput } from './dto/create-patient.schema';
import { updatePatientSchema } from './dto/update-patient.schema';
import type { UpdatePatientInput } from './dto/update-patient.schema';
import { upsertHealthRecordSchema } from './dto/upsert-health-record.schema';
import type { UpsertHealthRecordInput } from './dto/upsert-health-record.schema';
import { PatientPermissionGuard } from './patient-permission.guard';
import { RequirePatientPermission } from './patient-permission.decorator';
import { PatientsService } from './patients.service';

/**
 * Rotas tenant-scoped normais (passam por TenantMiddleware/TenantMatchGuard
 * como qualquer rota de negócio; sem @SkipTenantMatch). Rotas de
 * ficha de saúde separadas de propósito (/health-record) — nunca um
 * endpoint que "às vezes" inclui saúde dependendo do papel de quem chama,
 * ver comentário em prisma/schema.prisma (model Patient).
 */
@Controller('patients')
@UseGuards(PatientPermissionGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @RequirePatientPermission('create')
  create(
    @Body(new ZodValidationPipe(createPatientSchema))
    dto: CreatePatientInput,
  ) {
    return this.patientsService.create(dto);
  }

  @Get()
  @RequirePatientPermission('read')
  findMany() {
    return this.patientsService.findMany();
  }

  @Get(':patientId')
  @RequirePatientPermission('read')
  findOne(@Param('patientId') patientId: string) {
    return this.patientsService.findOne(patientId);
  }

  @Patch(':patientId')
  @RequirePatientPermission('update')
  update(
    @Param('patientId') patientId: string,
    @Body(new ZodValidationPipe(updatePatientSchema))
    dto: UpdatePatientInput,
  ) {
    return this.patientsService.update(patientId, dto);
  }

  @Delete(':patientId')
  @RequirePatientPermission('delete')
  remove(@Param('patientId') patientId: string) {
    return this.patientsService.remove(patientId);
  }

  @Get(':patientId/health-record')
  @RequirePatientPermission('read_health_record')
  findHealthRecord(@Param('patientId') patientId: string) {
    return this.patientsService.findHealthRecord(patientId);
  }

  @Patch(':patientId/health-record')
  @RequirePatientPermission('update_health_record')
  updateHealthRecord(
    @Param('patientId') patientId: string,
    @Body(new ZodValidationPipe(upsertHealthRecordSchema))
    dto: UpsertHealthRecordInput,
  ) {
    return this.patientsService.updateHealthRecord(patientId, dto);
  }
}
