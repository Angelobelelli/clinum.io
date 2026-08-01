import { AgendamentoAuditLog } from '../../enterprise/entities/agendamento-audit-log';

export abstract class AgendamentoAuditLogsRepository {
  abstract create(log: AgendamentoAuditLog): Promise<AgendamentoAuditLog>;
}
