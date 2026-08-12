import { Either } from '@/core/either';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';

/**
 * Porta que modules/google-calendar/ consome para refletir, num
 * Agendamento já vinculado, uma mudança feita diretamente no Google
 * Calendar (ver ProcessGoogleCalendarWebhookNotificationUseCase). Fica em
 * infra/ (não em application/) porque, embora seja consumida de FORA do
 * módulo agenda, ela expõe uma operação de alto nível que ainda preserva
 * as regras de negócio de Agendamento (estado terminal) — nunca o
 * AgendamentosRepository bruto, que deixaria o chamador livre para violar
 * essas regras.
 *
 * Implementada por AgendamentoExternalSyncTargetImpl (mesma pasta) e
 * vinculada em AgendaModule (ver agenda.module.ts) — sentido único:
 * GoogleCalendarModule importa AgendaModule para consumir isto, nunca o
 * contrário (ver nota de dependência circular em
 * modules/google-calendar/infra/agenda-bridge/).
 */
export abstract class AgendamentoExternalSyncTarget {
  /** Usado por SyncAgendamentoToGoogleUseCase para ler o googleEventId atual e os dados do Agendamento antes de espelhar no Google. */
  abstract findById(agendamentoId: string): Promise<Agendamento | null>;

  abstract findByGoogleEventId(
    googleEventId: string,
  ): Promise<Agendamento | null>;

  /**
   * Aplica, num Agendamento já encontrado por findByGoogleEventId, uma
   * mudança originada no Google. Recusa se o agendamento já estiver em
   * estado terminal (mesma regra que update/cancel normais respeitam) —
   * quem chama trata isso como "nada a fazer", não como erro de usuário.
   */
  abstract applyExternalUpdate(params: {
    agendamentoId: string;
    dataHoraInicio?: Date;
    dataHoraFim?: Date;
    status?: 'cancelado';
  }): Promise<
    Either<
      AgendamentoNotFoundError | AgendamentoTerminalStateError,
      { agendamento: Agendamento }
    >
  >;

  /** Grava o vínculo inicial (googleEventId + syncedAt) após o primeiro sync de saída. */
  abstract linkGoogleEvent(params: {
    agendamentoId: string;
    googleEventId: string;
    syncedAt: Date;
  }): Promise<void>;
}
