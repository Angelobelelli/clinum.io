import { Injectable } from '@nestjs/common';
import { TenantScopedPrismaService } from '../../../../core/database/tenant-scoped-prisma.service';
import { PatientHealthRecordsRepository } from '../../application/repositories/patient-health-records-repository';
import { PatientHealthRecord } from '../../enterprise/entities/patient-health-record';
import { PrismaPatientHealthRecordMapper } from './mappers/prisma-patient-health-record-mapper';

@Injectable()
export class PrismaPatientHealthRecordsRepository implements PatientHealthRecordsRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async findByPatientId(
    patientId: string,
  ): Promise<PatientHealthRecord | null> {
    const record = await this.tenantPrisma.db.patientHealthRecord.findFirst({
      where: { patientId },
    });

    return record ? PrismaPatientHealthRecordMapper.toDomain(record) : null;
  }

  async create(record: PatientHealthRecord): Promise<PatientHealthRecord> {
    const created = await this.tenantPrisma.db.patientHealthRecord.create({
      data: PrismaPatientHealthRecordMapper.toPrismaCreate(record),
    });

    return PrismaPatientHealthRecordMapper.toDomain(created);
  }

  async save(record: PatientHealthRecord): Promise<PatientHealthRecord> {
    const updated = await this.tenantPrisma.db.patientHealthRecord.update({
      where: { id: record.id.toValue() },
      data: PrismaPatientHealthRecordMapper.toPrismaUpdate(record),
    });

    return PrismaPatientHealthRecordMapper.toDomain(updated);
  }
}
