import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';
import { EnqueueAgendaExternalSyncParams } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import {
  GOOGLE_CALENDAR_SYNC_QUEUE,
  GOOGLE_CALENDAR_WEBHOOK_QUEUE,
  PROCESS_WEBHOOK_NOTIFICATION_JOB,
  SYNC_AGENDAMENTO_JOB,
} from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';

export interface GoogleCalendarSyncJobPayload extends EnqueueAgendaExternalSyncParams {
  organizationId: string;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: true,
};

/**
 * Implementa GoogleCalendarQueueProducer (ver application/ports/) — único
 * ponto do módulo que conhece BullMQ. enqueueSync captura o organizationId
 * do contexto de tenant ATUAL (chamado de dentro da request HTTP que criou/
 * atualizou/cancelou o Agendamento — ver AgendaExternalCalendarSyncImpl) e o
 * grava no payload do job, porque o processor roda fora de qualquer request
 * e precisa reconstruir esse contexto manualmente (ver
 * processors/google-calendar-sync.processor.ts).
 */
@Injectable()
export class GoogleCalendarQueueService extends GoogleCalendarQueueProducer {
  constructor(
    @InjectQueue(GOOGLE_CALENDAR_SYNC_QUEUE) private readonly syncQueue: Queue,
    @InjectQueue(GOOGLE_CALENDAR_WEBHOOK_QUEUE)
    private readonly webhookQueue: Queue,
  ) {
    super();
  }

  async enqueueSync(payload: EnqueueAgendaExternalSyncParams): Promise<void> {
    const organizationId = getCurrentTenantId();
    const jobPayload: GoogleCalendarSyncJobPayload = {
      ...payload,
      organizationId,
    };

    await this.syncQueue.add(
      SYNC_AGENDAMENTO_JOB,
      jobPayload,
      DEFAULT_JOB_OPTIONS,
    );
  }

  async enqueueWebhookProcessing(payload: {
    organizationId: string;
    connectionId: string;
  }): Promise<void> {
    await this.webhookQueue.add(PROCESS_WEBHOOK_NOTIFICATION_JOB, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: true,
    });
  }
}
