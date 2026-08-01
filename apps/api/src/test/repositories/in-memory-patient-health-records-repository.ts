import { PatientHealthRecordsRepository } from '../../modules/patients/application/repositories/patient-health-records-repository';
import { PatientHealthRecord } from '../../modules/patients/enterprise/entities/patient-health-record';

export class InMemoryPatientHealthRecordsRepository implements PatientHealthRecordsRepository {
  public items: PatientHealthRecord[] = [];

  findByPatientId(patientId: string): Promise<PatientHealthRecord | null> {
    const record = this.items.find((item) => item.patientId === patientId);

    return Promise.resolve(record ?? null);
  }

  create(record: PatientHealthRecord): Promise<PatientHealthRecord> {
    this.items.push(record);

    return Promise.resolve(record);
  }

  save(record: PatientHealthRecord): Promise<PatientHealthRecord> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === record.id.toValue(),
    );

    if (index >= 0) {
      this.items[index] = record;
    }

    return Promise.resolve(record);
  }
}
