import type {
  Prisma,
  Agendamento as PrismaAgendamento,
} from '@generated/prisma/client';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';

export class PrismaAgendamentoMapper {
  static toDomain(raw: PrismaAgendamento): Agendamento {
    return Agendamento.create(
      {
        organizationId: raw.organizationId,
        servicoId: raw.servicoId,
        patientId: raw.patientId,
        profissionalId: raw.profissionalId,
        dataHoraInicio: raw.dataHoraInicio,
        dataHoraFim: raw.dataHoraFim,
        status: raw.status,
        observacao: raw.observacao,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  // organizationId: ver comentário equivalente em
  // patients/infra/database/mappers/prisma-patient-mapper.ts (sempre
  // sobrescrito pela extension de tenant no `create`).
  static toPrismaCreate(
    agendamento: Agendamento,
  ): Prisma.AgendamentoUncheckedCreateInput {
    return {
      organizationId: agendamento.organizationId,
      servicoId: agendamento.servicoId,
      patientId: agendamento.patientId,
      profissionalId: agendamento.profissionalId,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      status: agendamento.status,
      observacao: agendamento.observacao,
    };
  }

  static toPrismaUpdate(
    agendamento: Agendamento,
  ): Prisma.AgendamentoUncheckedUpdateInput {
    return {
      servicoId: agendamento.servicoId,
      patientId: agendamento.patientId,
      profissionalId: agendamento.profissionalId,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      status: agendamento.status,
      observacao: agendamento.observacao,
    };
  }
}
