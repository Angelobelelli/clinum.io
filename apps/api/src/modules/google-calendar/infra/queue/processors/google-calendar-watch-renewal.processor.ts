import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';
import { FindExpiringGoogleCalendarWatchChannelsUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channels';
import { RenewGoogleCalendarWatchChannelUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channel';
import { GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE } from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';

/**
 * A varredura em si (achar conexões expirando) é cross-tenant; a renovação
 * de cada uma roda dentro do tenant certo (ver
 * FindExpiringGoogleCalendarWatchChannelsUseCase para o porquê da divisão
 * em dois use-cases). Falhas individuais são logadas e não abortam o lote.
 */
@Processor(GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE)
export class GoogleCalendarWatchRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(
    GoogleCalendarWatchRenewalProcessor.name,
  );

  constructor(
    private readonly findExpiringUseCase: FindExpiringGoogleCalendarWatchChannelsUseCase,
    private readonly renewOneUseCase: RenewGoogleCalendarWatchChannelUseCase,
  ) {
    super();
  }

  async process(): Promise<void> {
    const { connections } = await this.findExpiringUseCase.execute();

    const results = await Promise.allSettled(
      connections.map(({ connectionId, organizationId }) =>
        runWithTenantContext({ organizationId }, () =>
          this.renewOneUseCase.execute({ connectionId }),
        ),
      ),
    );

    const failed = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    failed.forEach((result) => {
      this.logger.error(`Falha ao renovar canal de watch: ${result.reason}`);
    });

    this.logger.log(
      `Renovação de canais: ${results.length - failed.length} ok, ${failed.length} falharam.`,
    );
  }
}
