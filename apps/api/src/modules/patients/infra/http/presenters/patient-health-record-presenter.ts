import { PatientHealthRecord } from '../../../enterprise/entities/patient-health-record';

export class PatientHealthRecordPresenter {
  static toHTTP(record: PatientHealthRecord) {
    return {
      id: record.id.toValue(),
      organizationId: record.organizationId,
      patientId: record.patientId,
      alergias: record.alergias,
      historico: record.historico,
      observacoesClinicas: record.observacoesClinicas,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
