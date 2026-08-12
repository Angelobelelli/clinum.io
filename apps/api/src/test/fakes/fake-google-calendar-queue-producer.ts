import { EnqueueAgendaExternalSyncParams } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';

export class FakeGoogleCalendarQueueProducer implements GoogleCalendarQueueProducer {
  public syncCalls: EnqueueAgendaExternalSyncParams[] = [];
  public webhookCalls: { organizationId: string; connectionId: string }[] = [];

  enqueueSync(payload: EnqueueAgendaExternalSyncParams): Promise<void> {
    this.syncCalls.push(payload);
    return Promise.resolve();
  }

  enqueueWebhookProcessing(payload: {
    organizationId: string;
    connectionId: string;
  }): Promise<void> {
    this.webhookCalls.push(payload);
    return Promise.resolve();
  }
}
