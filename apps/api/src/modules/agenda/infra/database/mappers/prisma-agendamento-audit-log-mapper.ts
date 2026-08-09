import type {
  Prisma,
  AgendamentoAuditLog as PrismaAgendamentoAuditLog,
} from '@generated/prisma/client';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { AgendamentoAuditLog } from '@/modules/agenda/enterprise/entities/agendamento-audit-log';

export class PrismaAgendamentoAuditLogMapper {
  static toDomain(raw: PrismaAgendamentoAuditLog): AgendamentoAuditLog {
    return AgendamentoAuditLog.create(
      {
        organizationId: raw.organizationId,
        agendamentoId: raw.agendamentoId,
        adminUserId: raw.adminUserId,
        statusAnterior: raw.statusAnterior,
        statusNovo: raw.statusNovo,
        motivo: raw.motivo,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  // organizationId: ver comentário equivalente em prisma-agendamento-mapper.ts.
  static toPrismaCreate(
    log: AgendamentoAuditLog,
  ): Prisma.AgendamentoAuditLogUncheckedCreateInput {
    return {
      organizationId: log.organizationId,
      agendamentoId: log.agendamentoId,
      adminUserId: log.adminUserId,
      statusAnterior: log.statusAnterior,
      statusNovo: log.statusNovo,
      motivo: log.motivo,
    };
  }
}
