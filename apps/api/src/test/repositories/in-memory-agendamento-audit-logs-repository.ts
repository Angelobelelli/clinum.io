import { AgendamentoAuditLogsRepository } from '../../modules/agenda/application/repositories/agendamento-audit-logs-repository';
import { AgendamentoAuditLog } from '../../modules/agenda/enterprise/entities/agendamento-audit-log';

export class InMemoryAgendamentoAuditLogsRepository implements AgendamentoAuditLogsRepository {
  public items: AgendamentoAuditLog[] = [];

  create(log: AgendamentoAuditLog): Promise<AgendamentoAuditLog> {
    this.items.push(log);

    return Promise.resolve(log);
  }
}
