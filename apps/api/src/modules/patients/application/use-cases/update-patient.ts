import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { Patient } from '../../enterprise/entities/patient';
import { PatientsRepository } from '../repositories/patients-repository';
import { PatientNotFoundError } from './errors/patient-not-found-error';

export interface UpdatePatientUseCaseRequest {
  patientId: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataNascimento?: Date;
  dadosVerticais?: Record<string, unknown>;
}

export type UpdatePatientUseCaseResponse = Either<
  PatientNotFoundError,
  { patient: Patient }
>;

@Injectable()
export class UpdatePatientUseCase {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  async execute(
    request: UpdatePatientUseCaseRequest,
  ): Promise<UpdatePatientUseCaseResponse> {
    const patient = await this.patientsRepository.findById(request.patientId);

    if (!patient) {
      return left(new PatientNotFoundError());
    }

    if (request.nome !== undefined) patient.nome = request.nome;
    if (request.cpf !== undefined) patient.cpf = request.cpf;
    if (request.telefone !== undefined) patient.telefone = request.telefone;
    if (request.email !== undefined) patient.email = request.email;
    if (request.dataNascimento !== undefined)
      patient.dataNascimento = request.dataNascimento;
    if (request.dadosVerticais !== undefined)
      patient.dadosVerticais = request.dadosVerticais;

    const updatedPatient = await this.patientsRepository.save(patient);

    return right({ patient: updatedPatient });
  }
}
