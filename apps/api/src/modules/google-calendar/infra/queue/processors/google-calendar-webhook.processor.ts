import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';
import { ProcessGoogleCalendarWebhookNotificationUseCase } from '@/modules/google-calendar/application/use-cases/process-google-calendar-webhook-notification';
import { GOOGLE_CALENDAR_WEBHOOK_QUEUE } from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';

export interface GoogleCalendarWebhookJobPayload {
  organizationId: string;
  connectionId: string;
}

@Processor(GOOGLE_CALENDAR_WEBHOOK_QUEUE)
export class GoogleCalendarWebhookProcessor extends WorkerHost {
  constructor(
    private readonly processNotificationUseCase: ProcessGoogleCalendarWebhookNotificationUseCase,
  ) {
    super();
  }

  async process(job: Job<GoogleCalendarWebhookJobPayload>): Promise<void> {
    const { organizationId, connectionId } = job.data;

    return runWithTenantContext({ organizationId }, () =>
      this.processNotificationUseCase.execute({ connectionId }),
    );
  }
}
