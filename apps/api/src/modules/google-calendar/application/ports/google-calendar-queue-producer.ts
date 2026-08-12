import { EnqueueAgendaExternalSyncParams } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';

/**
 * Porta que os use-cases de modules/google-calendar/ consomem para
 * enfileirar trabalho assíncrono — nenhum use-case importa BullMQ
 * diretamente (ver infra/queue/google-calendar-queue.service.ts, que
 * implementa isto). Mantém application/ livre de detalhes de
 * infraestrutura, mesmo racional de AgendaExternalCalendarSyncPort.
 */
export abstract class GoogleCalendarQueueProducer {
  /** Reaproveita o payload que agenda/ já monta (ver AgendaExternalCalendarSyncPort) — mesma forma, sem tradução. */
  abstract enqueueSync(payload: EnqueueAgendaExternalSyncParams): Promise<void>;

  abstract enqueueWebhookProcessing(payload: {
    organizationId: string;
    connectionId: string;
  }): Promise<void>;
}
