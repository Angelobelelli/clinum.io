import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { AgendamentoStatusValue } from '@/modules/agenda/enterprise/entities/agendamento';

export interface AgendamentoAuditLogProps {
  organizationId: string;
  agendamentoId: string;
  adminUserId: string;
  statusAnterior: AgendamentoStatusValue;
  statusNovo: AgendamentoStatusValue;
  motivo: string;
  createdAt: Date;
}

export class AgendamentoAuditLog extends Entity<AgendamentoAuditLogProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get agendamentoId(): string {
    return this.props.agendamentoId;
  }

  get adminUserId(): string {
    return this.props.adminUserId;
  }

  get statusAnterior(): AgendamentoStatusValue {
    return this.props.statusAnterior;
  }

  get statusNovo(): AgendamentoStatusValue {
    return this.props.statusNovo;
  }

  get motivo(): string {
    return this.props.motivo;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(
    props: Omit<AgendamentoAuditLogProps, 'createdAt'> &
      Partial<Pick<AgendamentoAuditLogProps, 'createdAt'>>,
    id?: UniqueEntityID,
  ): AgendamentoAuditLog {
    return new AgendamentoAuditLog(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }
}
