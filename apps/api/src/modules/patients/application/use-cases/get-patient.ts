import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { Patient } from '../../enterprise/entities/patient';
import { PatientsRepository } from '../repositories/patients-repository';
import { PatientNotFoundError } from './errors/patient-not-found-error';

export interface GetPatientUseCaseRequest {
  patientId: string;
}

export type GetPatientUseCaseResponse = Either<
  PatientNotFoundError,
  { patient: Patient }
>;

@Injectable()
export class GetPatientUseCase {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  async execute({
    patientId,
  }: GetPatientUseCaseRequest): Promise<GetPatientUseCaseResponse> {
    const patient = await this.patientsRepository.findById(patientId);

    if (!patient) {
      return left(new PatientNotFoundError());
    }

    return right({ patient });
  }
}
