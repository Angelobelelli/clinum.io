import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { env } from '@/core/env/env';
import { GoogleCalendarEventsClient } from '@/integrations/google-calendar/google-calendar-events-client';
import { GoogleCalendarFreeBusyClient } from '@/integrations/google-calendar/google-calendar-freebusy-client';
import { GoogleCalendarWatchClient } from '@/integrations/google-calendar/google-calendar-watch-client';
import { GoogleOAuthClient } from '@/integrations/google-calendar/google-oauth-client';
import {
  GoogleCalendarChangesResult,
  GoogleCalendarEventData,
  GoogleCalendarGateway,
} from '@/modules/google-calendar/application/ports/google-calendar-gateway';

/** Chaves gravadas em extendedProperties.private do evento no Google — ver GoogleCalendarEventData. */
const AGENDAMENTO_ID_PROPERTY = 'clinumAgendamentoId';
const SYNC_VERSION_PROPERTY = 'clinumSyncVersion';

@Injectable()
export class GoogleCalendarGatewayImpl extends GoogleCalendarGateway {
  constructor(
    private readonly oauthClient: GoogleOAuthClient,
    private readonly eventsClient: GoogleCalendarEventsClient,
    private readonly freeBusyClient: GoogleCalendarFreeBusyClient,
    private readonly watchClient: GoogleCalendarWatchClient,
  ) {
    super();
  }

  buildAuthUrl(state: string): string {
    return this.oauthClient.buildAuthUrl(state);
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ refreshToken: string; googleAccountEmail: string }> {
    const tokens = await this.oauthClient.exchangeCodeForTokens(code);

    if (!tokens.refreshToken) {
      throw new Error(
        'O Google não devolveu um refresh token — verifique se prompt=consent e access_type=offline estão sendo usados.',
      );
    }

    return {
      refreshToken: tokens.refreshToken,
      googleAccountEmail: tokens.googleAccountEmail,
    };
  }

  async revokeAccess(refreshToken: string): Promise<void> {
    await this.oauthClient.revokeToken(refreshToken);
  }

  async upsertEvent(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId?: string;
    event: GoogleCalendarEventData;
  }): Promise<{ googleEventId: string }> {
    const event = {
      summary: params.event.summary,
      description: params.event.description,
      startIso: params.event.dataHoraInicio.toISOString(),
      endIso: params.event.dataHoraFim.toISOString(),
      extendedPrivateProperties: {
        [AGENDAMENTO_ID_PROPERTY]: params.event.agendamentoId,
        [SYNC_VERSION_PROPERTY]: params.event.syncVersionIso,
      },
    };

    if (params.googleEventId) {
      await this.eventsClient.update({
        refreshToken: params.refreshToken,
        calendarId: params.calendarId,
        googleEventId: params.googleEventId,
        event,
      });
      return { googleEventId: params.googleEventId };
    }

    return this.eventsClient.insert({
      refreshToken: params.refreshToken,
      calendarId: params.calendarId,
      event,
    });
  }

  async deleteEvent(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId: string;
  }): Promise<void> {
    await this.eventsClient.delete(params);
  }

  async hasConflict(params: {
    refreshToken: string;
    calendarId: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
  }): Promise<boolean> {
    const { busy } = await this.freeBusyClient.query({
      refreshToken: params.refreshToken,
      calendarId: params.calendarId,
      startIso: params.dataHoraInicio.toISOString(),
      endIso: params.dataHoraFim.toISOString(),
    });
    return busy;
  }

  async createWatchChannel(params: {
    refreshToken: string;
    calendarId: string;
  }): Promise<{
    channelId: string;
    channelToken: string;
    resourceId: string;
    expiresAt: Date;
  }> {
    const channelId = randomUUID();
    const channelToken = randomUUID();

    const result = await this.watchClient.watch({
      refreshToken: params.refreshToken,
      calendarId: params.calendarId,
      webhookUrl: env.GOOGLE_CALENDAR_WEBHOOK_URL,
      channelId,
      channelToken,
    });

    return {
      channelId: result.channelId,
      channelToken,
      resourceId: result.resourceId,
      expiresAt: new Date(result.expirationEpochMs),
    };
  }

  async stopWatchChannel(params: {
    refreshToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    await this.watchClient.stop(params);
  }

  async listChanges(params: {
    refreshToken: string;
    calendarId: string;
    syncToken?: string;
  }): Promise<GoogleCalendarChangesResult> {
    const page = await this.eventsClient.listChangedEvents(params);

    return {
      changes: page.changes.map((change) => ({
        googleEventId: change.googleEventId,
        status: change.status,
        dataHoraInicio: change.startIso ? new Date(change.startIso) : undefined,
        dataHoraFim: change.endIso ? new Date(change.endIso) : undefined,
        agendamentoId:
          change.extendedPrivateProperties?.[AGENDAMENTO_ID_PROPERTY],
        syncVersionIso:
          change.extendedPrivateProperties?.[SYNC_VERSION_PROPERTY],
      })),
      nextSyncToken: page.nextSyncToken,
    };
  }
}
