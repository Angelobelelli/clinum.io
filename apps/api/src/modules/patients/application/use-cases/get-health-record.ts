import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { PatientHealthRecord } from '../../enterprise/entities/patient-health-record';
import { PatientHealthRecordsRepository } from '../repositories/patient-health-records-repository';
import { PatientsRepository } from '../repositories/patients-repository';
import { HealthRecordNotFoundError } from './errors/health-record-not-found-error';
import { PatientNotFoundError } from './errors/patient-not-found-error';

export interface GetHealthRecordUseCaseRequest {
  patientId: string;
}

export type GetHealthRecordUseCaseResponse = Either<
  PatientNotFoundError | HealthRecordNotFoundError,
  { healthRecord: PatientHealthRecord }
>;

@Injectable()
export class GetHealthRecordUseCase {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly patientHealthRecordsRepository: PatientHealthRecordsRepository,
  ) {}

  async execute({
    patientId,
  }: GetHealthRecordUseCaseRequest): Promise<GetHealthRecordUseCaseResponse> {
    const patient = await this.patientsRepository.findById(patientId);

    if (!patient) {
      return left(new PatientNotFoundError());
    }

    const healthRecord =
      await this.patientHealthRecordsRepository.findByPatientId(patientId);

    if (!healthRecord) {
      return left(new HealthRecordNotFoundError());
    }

    return right({ healthRecord });
  }
}
