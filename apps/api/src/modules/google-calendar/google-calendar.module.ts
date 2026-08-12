import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GoogleCalendarIntegrationModule } from '@/integrations/google-calendar/google-calendar-integration.module';
import { AgendaModule } from '@/modules/agenda/agenda.module';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { AcknowledgeGoogleCalendarWebhookUseCase } from '@/modules/google-calendar/application/use-cases/acknowledge-google-calendar-webhook';
import { CheckFreeBusyConflictUseCase } from '@/modules/google-calendar/application/use-cases/check-free-busy-conflict';
import { DisconnectGoogleCalendarUseCase } from '@/modules/google-calendar/application/use-cases/disconnect-google-calendar';
import { HandleGoogleOauthCallbackUseCase } from '@/modules/google-calendar/application/use-cases/handle-google-oauth-callback';
import { ListGoogleCalendarConnectionsUseCase } from '@/modules/google-calendar/application/use-cases/list-google-calendar-connections';
import { ProcessGoogleCalendarWebhookNotificationUseCase } from '@/modules/google-calendar/application/use-cases/process-google-calendar-webhook-notification';
import { RenewGoogleCalendarWatchChannelUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channel';
import { FindExpiringGoogleCalendarWatchChannelsUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channels';
import { StartGoogleCalendarOAuthUseCase } from '@/modules/google-calendar/application/use-cases/start-google-calendar-oauth';
import { SyncAgendamentoToGoogleUseCase } from '@/modules/google-calendar/application/use-cases/sync-agendamento-to-google';
import { PrismaGoogleCalendarConnectionsRepository } from '@/modules/google-calendar/infra/database/prisma-google-calendar-connections-repository';
import { GoogleCalendarGatewayImpl } from '@/modules/google-calendar/infra/gateways/google-calendar-gateway.impl';
import { DisconnectGoogleCalendarController } from '@/modules/google-calendar/infra/http/controllers/disconnect-google-calendar.controller';
import { GoogleCalendarWebhookController } from '@/modules/google-calendar/infra/http/controllers/google-calendar-webhook.controller';
import { GoogleOAuthCallbackController } from '@/modules/google-calendar/infra/http/controllers/google-oauth-callback.controller';
import { ListGoogleCalendarConnectionsController } from '@/modules/google-calendar/infra/http/controllers/list-google-calendar-connections.controller';
import { StartGoogleCalendarOAuthController } from '@/modules/google-calendar/infra/http/controllers/start-google-calendar-oauth.controller';
import {
  GOOGLE_CALENDAR_SYNC_QUEUE,
  GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE,
  GOOGLE_CALENDAR_WEBHOOK_QUEUE,
} from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';
import { GoogleCalendarQueueService } from '@/modules/google-calendar/infra/queue/google-calendar-queue.service';
import { GoogleCalendarWatchRenewalScheduler } from '@/modules/google-calendar/infra/queue/google-calendar-watch-renewal.scheduler';
import { GoogleCalendarSyncProcessor } from '@/modules/google-calendar/infra/queue/processors/google-calendar-sync.processor';
import { GoogleCalendarWatchRenewalProcessor } from '@/modules/google-calendar/infra/queue/processors/google-calendar-watch-renewal.processor';
import { GoogleCalendarWebhookProcessor } from '@/modules/google-calendar/infra/queue/processors/google-calendar-webhook.processor';

@Module({
  imports: [
    // Sentido único: google-calendar consome AgendamentoExternalSyncTarget
    // (exportado por AgendaModule) — AgendaModule nunca importa este
    // módulo de volta (ver infra/agenda-bridge/ para o binding no sentido
    // contrário, feito por um módulo @Global() dedicado).
    AgendaModule,
    GoogleCalendarIntegrationModule,
    BullModule.registerQueue(
      { name: GOOGLE_CALENDAR_SYNC_QUEUE },
      { name: GOOGLE_CALENDAR_WEBHOOK_QUEUE },
      { name: GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE },
    ),
  ],
  controllers: [
    StartGoogleCalendarOAuthController,
    GoogleOAuthCallbackController,
    DisconnectGoogleCalendarController,
    ListGoogleCalendarConnectionsController,
    GoogleCalendarWebhookController,
  ],
  providers: [
    {
      provide: GoogleCalendarConnectionsRepository,
      useClass: PrismaGoogleCalendarConnectionsRepository,
    },
    { provide: GoogleCalendarGateway, useClass: GoogleCalendarGatewayImpl },
    {
      provide: GoogleCalendarQueueProducer,
      useClass: GoogleCalendarQueueService,
    },
    StartGoogleCalendarOAuthUseCase,
    HandleGoogleOauthCallbackUseCase,
    DisconnectGoogleCalendarUseCase,
    ListGoogleCalendarConnectionsUseCase,
    CheckFreeBusyConflictUseCase,
    SyncAgendamentoToGoogleUseCase,
    AcknowledgeGoogleCalendarWebhookUseCase,
    ProcessGoogleCalendarWebhookNotificationUseCase,
    FindExpiringGoogleCalendarWatchChannelsUseCase,
    RenewGoogleCalendarWatchChannelUseCase,
    GoogleCalendarSyncProcessor,
    GoogleCalendarWebhookProcessor,
    GoogleCalendarWatchRenewalProcessor,
    GoogleCalendarWatchRenewalScheduler,
  ],
  // Consumidos por AgendaGoogleCalendarBindingModule (ver
  // infra/agenda-bridge/) para montar AgendaExternalCalendarSyncImpl, a
  // implementação real de AgendaExternalCalendarSyncPort.
  exports: [
    GoogleCalendarConnectionsRepository,
    CheckFreeBusyConflictUseCase,
    GoogleCalendarQueueProducer,
  ],
})
export class GoogleCalendarModule {}
