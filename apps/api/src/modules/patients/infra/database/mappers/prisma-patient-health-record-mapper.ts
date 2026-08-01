import type {
  Prisma,
  PatientHealthRecord as PrismaPatientHealthRecord,
} from '../../../../../../generated/prisma/client';
import { UniqueEntityID } from '../../../../../core/entities/unique-entity-id';
import { PatientHealthRecord } from '../../../enterprise/entities/patient-health-record';

export class PrismaPatientHealthRecordMapper {
  static toDomain(raw: PrismaPatientHealthRecord): PatientHealthRecord {
    return PatientHealthRecord.create(
      {
        organizationId: raw.organizationId,
        patientId: raw.patientId,
        alergias: raw.alergias,
        historico: raw.historico,
        observacoesClinicas: raw.observacoesClinicas,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  // organizationId: ver comentário equivalente em prisma-patient-mapper.ts
  // (sempre sobrescrito pela extension de tenant no `create`).
  static toPrismaCreate(
    record: PatientHealthRecord,
  ): Prisma.PatientHealthRecordUncheckedCreateInput {
    return {
      organizationId: record.organizationId,
      patientId: record.patientId,
      alergias: record.alergias,
      historico: record.historico,
      observacoesClinicas: record.observacoesClinicas,
    };
  }

  static toPrismaUpdate(
    record: PatientHealthRecord,
  ): Prisma.PatientHealthRecordUpdateInput {
    return {
      alergias: record.alergias,
      historico: record.historico,
      observacoesClinicas: record.observacoesClinicas,
    };
  }
}
