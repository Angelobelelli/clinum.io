import type {
  Prisma,
  Patient as PrismaPatient,
} from '@generated/prisma/client';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Patient } from '@/modules/patients/enterprise/entities/patient';

export class PrismaPatientMapper {
  static toDomain(raw: PrismaPatient): Patient {
    return Patient.create(
      {
        organizationId: raw.organizationId,
        nome: raw.nome,
        cpf: raw.cpf,
        telefone: raw.telefone,
        email: raw.email,
        dataNascimento: raw.dataNascimento,
        dadosVerticais: raw.dadosVerticais as Record<string, unknown> | null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  /**
   * organizationId incluído aqui só para satisfazer o tipo gerado pelo
   * Prisma — em `create`, a Prisma Client Extension de tenant sobrescreve
   * esse valor com o organizationId real do contexto (ver
   * prisma-tenant.extension.ts), então o que a entidade carrega neste ponto
   * é irrelevante para o resultado final.
   */
  static toPrismaCreate(patient: Patient): Prisma.PatientUncheckedCreateInput {
    return {
      organizationId: patient.organizationId,
      nome: patient.nome,
      cpf: patient.cpf,
      telefone: patient.telefone,
      email: patient.email,
      dataNascimento: patient.dataNascimento,
      dadosVerticais: patient.dadosVerticais as
        Prisma.InputJsonValue | undefined,
    };
  }

  static toPrismaUpdate(patient: Patient): Prisma.PatientUpdateInput {
    return {
      nome: patient.nome,
      cpf: patient.cpf,
      telefone: patient.telefone,
      email: patient.email,
      dataNascimento: patient.dataNascimento,
      dadosVerticais: patient.dadosVerticais as
        Prisma.InputJsonValue | undefined,
    };
  }
}
