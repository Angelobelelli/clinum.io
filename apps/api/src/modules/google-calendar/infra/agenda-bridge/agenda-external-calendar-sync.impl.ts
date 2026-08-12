import { Injectable } from '@nestjs/common';
import {
  AgendaExternalCalendarSyncPort,
  EnqueueAgendaExternalSyncParams,
} from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { CheckFreeBusyConflictUseCase } from '@/modules/google-calendar/application/use-cases/check-free-busy-conflict';

/**
 * Implementação real da porta que agenda/ consome (ver
 * modules/agenda/application/ports/agenda-external-calendar-sync.ts).
 * Ligada via DI em AgendaGoogleCalendarBindingModule (mesma pasta) — sentido
 * único (google-calendar → agenda), ver comentário lá.
 */
@Injectable()
export class AgendaExternalCalendarSyncImpl extends AgendaExternalCalendarSyncPort {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly checkFreeBusyConflictUseCase: CheckFreeBusyConflictUseCase,
    private readonly queueProducer: GoogleCalendarQueueProducer,
  ) {
    super();
  }

  async checkFreeBusyConflict(params: {
    profissionalId: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
  }): Promise<boolean> {
    const { conflict } =
      await this.checkFreeBusyConflictUseCase.execute(params);
    return conflict;
  }

  /**
   * Só enfileira se o profissional ATUAL ou o ANTERIOR (remarcação) tiver
   * conexão ativa — evita gerar tráfego de fila para organizações que nunca
   * conectaram ninguém ao Google Calendar. SyncAgendamentoToGoogleUseCase
   * (o processor) também re-checa a conexão por conta própria, então isto
   * é uma otimização, não a única linha de defesa.
   */
  async enqueueSync(params: EnqueueAgendaExternalSyncParams): Promise<void> {
    const [currentConnection, previousConnection] = await Promise.all([
      this.connectionsRepository.findByMemberId(params.profissionalId),
      params.previousProfissionalId
        ? this.connectionsRepository.findByMemberId(
            params.previousProfissionalId,
          )
        : Promise.resolve(null),
    ]);

    if (!currentConnection && !previousConnection) {
      return;
    }

    await this.queueProducer.enqueueSync(params);
  }
}
