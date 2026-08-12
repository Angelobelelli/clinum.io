import { Module } from '@nestjs/common';
import { GoogleCalendarEventsClient } from '@/integrations/google-calendar/google-calendar-events-client';
import { GoogleCalendarFreeBusyClient } from '@/integrations/google-calendar/google-calendar-freebusy-client';
import { GoogleCalendarWatchClient } from '@/integrations/google-calendar/google-calendar-watch-client';
import { GoogleOAuthClient } from '@/integrations/google-calendar/google-oauth-client';

/**
 * Adapter puro do SDK do Google Calendar — sem controllers, sem lógica de
 * domínio, sem import de src/modules/**. Consumido por
 * modules/google-calendar/infra/gateways/google-calendar-gateway.impl.ts,
 * que traduz entre o vocabulário genérico daqui e os DTOs de negócio.
 */
@Module({
  providers: [
    GoogleOAuthClient,
    GoogleCalendarEventsClient,
    GoogleCalendarFreeBusyClient,
    GoogleCalendarWatchClient,
  ],
  exports: [
    GoogleOAuthClient,
    GoogleCalendarEventsClient,
    GoogleCalendarFreeBusyClient,
    GoogleCalendarWatchClient,
  ],
})
export class GoogleCalendarIntegrationModule {}
