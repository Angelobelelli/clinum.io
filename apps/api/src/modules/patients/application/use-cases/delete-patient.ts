import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { PatientsRepository } from '../repositories/patients-repository';
import { PatientNotFoundError } from './errors/patient-not-found-error';

export interface DeletePatientUseCaseRequest {
  patientId: string;
}

export type DeletePatientUseCaseResponse = Either<PatientNotFoundError, null>;

@Injectable()
export class DeletePatientUseCase {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  async execute({
    patientId,
  }: DeletePatientUseCaseRequest): Promise<DeletePatientUseCaseResponse> {
    const patient = await this.patientsRepository.findById(patientId);

    if (!patient) {
      return left(new PatientNotFoundError());
    }

    await this.patientsRepository.delete(patientId);

    return right(null);
  }
}
