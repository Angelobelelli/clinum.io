import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  AgendamentoAuditLog,
  AgendamentoAuditLogProps,
} from '@/modules/agenda/enterprise/entities/agendamento-audit-log';

export function makeAgendamentoAuditLog(
  override: Partial<AgendamentoAuditLogProps> = {},
  id?: UniqueEntityID,
): AgendamentoAuditLog {
  return AgendamentoAuditLog.create(
    {
      organizationId: 'org-test',
      agendamentoId: new UniqueEntityID().toValue(),
      adminUserId: new UniqueEntityID().toValue(),
      statusAnterior: 'cancelado',
      statusNovo: 'agendado',
      motivo: 'Motivo de teste com mais de dez caracteres',
      ...override,
    },
    id,
  );
}
