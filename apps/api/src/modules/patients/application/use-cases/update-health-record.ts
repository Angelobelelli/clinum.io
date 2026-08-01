import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { PatientHealthRecord } from '../../enterprise/entities/patient-health-record';
import { PatientHealthRecordsRepository } from '../repositories/patient-health-records-repository';
import { PatientsRepository } from '../repositories/patients-repository';
import { HealthRecordNotFoundError } from './errors/health-record-not-found-error';
import { PatientNotFoundError } from './errors/patient-not-found-error';

export interface UpdateHealthRecordUseCaseRequest {
  patientId: string;
  alergias?: string;
  historico?: string;
  observacoesClinicas?: string;
}

export type UpdateHealthRecordUseCaseResponse = Either<
  PatientNotFoundError | HealthRecordNotFoundError,
  { healthRecord: PatientHealthRecord }
>;

@Injectable()
export class UpdateHealthRecordUseCase {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly patientHealthRecordsRepository: PatientHealthRecordsRepository,
  ) {}

  async execute(
    request: UpdateHealthRecordUseCaseRequest,
  ): Promise<UpdateHealthRecordUseCaseResponse> {
    const patient = await this.patientsRepository.findById(request.patientId);

    if (!patient) {
      return left(new PatientNotFoundError());
    }

    const healthRecord =
      await this.patientHealthRecordsRepository.findByPatientId(
        request.patientId,
      );

    if (!healthRecord) {
      return left(new HealthRecordNotFoundError());
    }

    if (request.alergias !== undefined)
      healthRecord.alergias = request.alergias;
    if (request.historico !== undefined)
      healthRecord.historico = request.historico;
    if (request.observacoesClinicas !== undefined)
      healthRecord.observacoesClinicas = request.observacoesClinicas;

    const updatedRecord =
      await this.patientHealthRecordsRepository.save(healthRecord);

    return right({ healthRecord: updatedRecord });
  }
}
