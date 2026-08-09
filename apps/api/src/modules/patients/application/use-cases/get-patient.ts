import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { Patient } from '@/modules/patients/enterprise/entities/patient';
import { PatientsRepository } from '@/modules/patients/application/repositories/patients-repository';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';

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
