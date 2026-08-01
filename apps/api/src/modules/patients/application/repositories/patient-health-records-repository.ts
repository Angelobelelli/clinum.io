import { PatientHealthRecord } from '../../enterprise/entities/patient-health-record';

export abstract class PatientHealthRecordsRepository {
  abstract findByPatientId(
    patientId: string,
  ): Promise<PatientHealthRecord | null>;
  abstract create(record: PatientHealthRecord): Promise<PatientHealthRecord>;
  abstract save(record: PatientHealthRecord): Promise<PatientHealthRecord>;
}
