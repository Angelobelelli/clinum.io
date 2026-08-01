import { Injectable } from '@nestjs/common';
import { Patient } from '../../enterprise/entities/patient';
import { PatientHealthRecord } from '../../enterprise/entities/patient-health-record';
import { PatientHealthRecordsRepository } from '../repositories/patient-health-records-repository';
import { PatientsRepository } from '../repositories/patients-repository';

// organizationId placeholder: sempre sobrescrito em runtime pela Prisma
// Client Extension de tenant (ver prisma-tenant.extension.ts), que injeta o
// organizationId real em todo `create` de model tenant-scoped. A entidade
// aqui na camada de aplicação não sabe (nem precisa saber) qual é o tenant
// atual — só o repositório Prisma, na infra, lida com isso.
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface CreatePatientUseCaseRequest {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataNascimento?: Date;
  dadosVerticais?: Record<string, unknown>;
}

export interface CreatePatientUseCaseResponse {
  patient: Patient;
}

/**
 * Cria Patient + PatientHealthRecord (vazio) em 2 passos sequenciais, não
 * numa única transação externa — de propósito. Cada operação no repositório
 * tenant-scoped já abre sua própria transação internamente (SET LOCAL +
 * insert, ver prisma-tenant.extension.ts); aninhar isso dentro de uma
 * transação externa não foi testado e arrisca abrir conexões diferentes pro
 * SET LOCAL e pro INSERT real. healthRecord é opcional no schema
 * (Patient.healthRecord?), então um Patient momentaneamente sem
 * PatientHealthRecord (só se o processo cair entre os dois passos) não é um
 * estado inválido — é só "sem ficha de saúde ainda".
 *
 * Sem erro de negócio esperado aqui (o único erro possível é violação de
 * constraint única do Postgres, já tratado globalmente pelo
 * PrismaExceptionFilter) — por isso não usa Either, diferente dos demais
 * use-cases deste módulo.
 */
@Injectable()
export class CreatePatientUseCase {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly patientHealthRecordsRepository: PatientHealthRecordsRepository,
  ) {}

  async execute(
    request: CreatePatientUseCaseRequest,
  ): Promise<CreatePatientUseCaseResponse> {
    const patient = Patient.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      nome: request.nome,
      cpf: request.cpf,
      telefone: request.telefone,
      email: request.email,
      dataNascimento: request.dataNascimento,
      dadosVerticais: request.dadosVerticais,
    });

    const createdPatient = await this.patientsRepository.create(patient);

    const healthRecord = PatientHealthRecord.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      patientId: createdPatient.id.toValue(),
    });

    await this.patientHealthRecordsRepository.create(healthRecord);

    return { patient: createdPatient };
  }
}
