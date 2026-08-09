import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  PatientHealthRecord,
  PatientHealthRecordProps,
} from '@/modules/patients/enterprise/entities/patient-health-record';

export function makePatientHealthRecord(
  override: Partial<PatientHealthRecordProps> = {},
  id?: UniqueEntityID,
): PatientHealthRecord {
  return PatientHealthRecord.create(
    {
      organizationId: 'org-test',
      patientId: new UniqueEntityID().toValue(),
      alergias: null,
      historico: null,
      observacoesClinicas: null,
      ...override,
    },
    id,
  );
}
