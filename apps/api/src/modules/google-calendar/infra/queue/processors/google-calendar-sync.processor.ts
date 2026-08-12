import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';
import { SyncAgendamentoToGoogleUseCase } from '@/modules/google-calendar/application/use-cases/sync-agendamento-to-google';
import { GOOGLE_CALENDAR_SYNC_QUEUE } from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';
import type { GoogleCalendarSyncJobPayload } from '@/modules/google-calendar/infra/queue/google-calendar-queue.service';

/**
 * Roda fora de qualquer request HTTP — reconstrói o contexto de tenant a
 * partir do organizationId gravado no payload do job (ver
 * GoogleCalendarQueueService.enqueueSync) antes de chamar o use-case, já
 * que os repositórios tenant-scoped exigem isso (ver
 * infra/tenant/tenant-context.ts).
 */
@Processor(GOOGLE_CALENDAR_SYNC_QUEUE)
export class GoogleCalendarSyncProcessor extends WorkerHost {
  constructor(
    private readonly syncAgendamentoToGoogleUseCase: SyncAgendamentoToGoogleUseCase,
  ) {
    super();
  }

  async process(job: Job<GoogleCalendarSyncJobPayload>): Promise<void> {
    const { organizationId, ...payload } = job.data;

    return runWithTenantContext({ organizationId }, () =>
      this.syncAgendamentoToGoogleUseCase.execute(payload),
    );
  }
}
