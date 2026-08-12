import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

export type AgendamentoStatusValue =
  'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta';

/**
 * Estados terminais: uma vez que um agendamento chega aqui, os use-cases
 * normais (update/cancel/update-status) não podem mais alterá-lo — só
 * RevertAgendamentoUseCase pode, e só de volta pra agendado/confirmado
 * (nunca outro estado terminal, ver reverter-agendamento.schema.ts).
 */
const ESTADOS_TERMINAIS: AgendamentoStatusValue[] = [
  'cancelado',
  'realizado',
  'falta',
];

/** Status que "ocupam" o horário do profissional — ver check-agendamento-overlap.ts. */
export const STATUS_QUE_BLOQUEIAM_HORARIO: AgendamentoStatusValue[] = [
  'agendado',
  'confirmado',
];

export interface AgendamentoProps {
  organizationId: string;
  servicoId?: string | null;
  patientId: string;
  profissionalId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  status: AgendamentoStatusValue;
  observacao?: string | null;
  // Sincronização com Google Calendar (ver modules/google-calendar/) —
  // opcionais, só preenchidos quando o profissional tem conexão ativa.
  googleEventId?: string | null;
  syncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Agendamento extends Entity<AgendamentoProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get servicoId(): string | null | undefined {
    return this.props.servicoId;
  }

  set servicoId(value: string | null | undefined) {
    this.props.servicoId = value;
    this.touch();
  }

  get patientId(): string {
    return this.props.patientId;
  }

  set patientId(value: string) {
    this.props.patientId = value;
    this.touch();
  }

  get profissionalId(): string {
    return this.props.profissionalId;
  }

  set profissionalId(value: string) {
    this.props.profissionalId = value;
    this.touch();
  }

  get dataHoraInicio(): Date {
    return this.props.dataHoraInicio;
  }

  set dataHoraInicio(value: Date) {
    this.props.dataHoraInicio = value;
    this.touch();
  }

  get dataHoraFim(): Date {
    return this.props.dataHoraFim;
  }

  set dataHoraFim(value: Date) {
    this.props.dataHoraFim = value;
    this.touch();
  }

  get status(): AgendamentoStatusValue {
    return this.props.status;
  }

  set status(value: AgendamentoStatusValue) {
    this.props.status = value;
    this.touch();
  }

  get observacao(): string | null | undefined {
    return this.props.observacao;
  }

  set observacao(value: string | null | undefined) {
    this.props.observacao = value;
    this.touch();
  }

  get googleEventId(): string | null | undefined {
    return this.props.googleEventId;
  }

  get syncedAt(): Date | null | undefined {
    return this.props.syncedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Vincula este Agendamento ao evento espelhado no Google Calendar e
   * registra o momento exato do sync — mesmo valor gravado em
   * extendedProperties.private.clinumSyncVersion do evento no Google,
   * usado como proteção contra eco (ver
   * ProcessGoogleCalendarWebhookNotificationUseCase). Chamado só por
   * SyncAgendamentoToGoogleUseCase (modules/google-calendar/), nunca pela
   * camada HTTP.
   */
  registrarSyncGoogle(googleEventId: string, syncedAt: Date): void {
    this.props.googleEventId = googleEventId;
    this.props.syncedAt = syncedAt;
  }

  isTerminal(): boolean {
    return ESTADOS_TERMINAIS.includes(this.props.status);
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  static create(
    props: Omit<AgendamentoProps, 'createdAt' | 'updatedAt' | 'status'> &
      Partial<Pick<AgendamentoProps, 'createdAt' | 'updatedAt' | 'status'>>,
    id?: UniqueEntityID,
  ): Agendamento {
    const now = new Date();

    return new Agendamento(
      {
        ...props,
        status: props.status ?? 'agendado',
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}
