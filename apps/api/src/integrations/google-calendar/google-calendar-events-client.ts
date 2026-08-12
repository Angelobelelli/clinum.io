import { Injectable } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import { GoogleOAuthClient } from '@/integrations/google-calendar/google-oauth-client';
import {
  GoogleCalendarEventChange,
  GoogleCalendarEventInput,
  GoogleCalendarEventsPage,
  GoogleSyncTokenExpiredError,
} from '@/integrations/google-calendar/google-calendar-integration.types';

function toGoogleRequestBody(
  event: GoogleCalendarEventInput,
): calendar_v3.Schema$Event {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startIso },
    end: { dateTime: event.endIso },
    extendedProperties: { private: event.extendedPrivateProperties },
  };
}

function toEventChange(
  item: calendar_v3.Schema$Event,
): GoogleCalendarEventChange {
  return {
    googleEventId: item.id!,
    status: item.status === 'cancelled' ? 'cancelled' : 'confirmed',
    startIso: item.start?.dateTime ?? undefined,
    endIso: item.end?.dateTime ?? undefined,
    updatedIso: item.updated!,
    extendedPrivateProperties: item.extendedProperties?.private ?? undefined,
  };
}

/** HTTP 410 Gone (googleapis tipa `code` como número em GaxiosError). */
function isGone(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Number(error.code) === 410
  );
}

/**
 * Wrapper sobre calendar.events.{insert,update,delete,list} — CRUD de
 * eventos e leitura incremental via syncToken. Nenhum conceito de negócio:
 * quem monta título/descrição/metadata é
 * modules/google-calendar/infra/gateways/google-calendar-gateway.impl.ts.
 */
@Injectable()
export class GoogleCalendarEventsClient {
  constructor(private readonly oauthClient: GoogleOAuthClient) {}

  private calendarFor(refreshToken: string): calendar_v3.Calendar {
    return google.calendar({
      version: 'v3',
      auth: this.oauthClient.authorizedClient(refreshToken),
    });
  }

  async insert(params: {
    refreshToken: string;
    calendarId: string;
    event: GoogleCalendarEventInput;
  }): Promise<{ googleEventId: string }> {
    const { data } = await this.calendarFor(params.refreshToken).events.insert({
      calendarId: params.calendarId,
      requestBody: toGoogleRequestBody(params.event),
    });
    return { googleEventId: data.id! };
  }

  async update(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId: string;
    event: GoogleCalendarEventInput;
  }): Promise<void> {
    await this.calendarFor(params.refreshToken).events.update({
      calendarId: params.calendarId,
      eventId: params.googleEventId,
      requestBody: toGoogleRequestBody(params.event),
    });
  }

  async delete(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId: string;
  }): Promise<void> {
    try {
      await this.calendarFor(params.refreshToken).events.delete({
        calendarId: params.calendarId,
        eventId: params.googleEventId,
      });
    } catch (error) {
      // 410/404: evento já removido no Google — idempotente do ponto de
      // vista de quem chama (ex: reprocessamento de job).
      if (!isGone(error) && !isNotFound(error)) {
        throw error;
      }
    }
  }

  /**
   * Pagina até o fim (nextPageToken) e devolve todas as mudanças + o
   * nextSyncToken final, que só vem preenchido na última página — ver
   * https://developers.google.com/calendar/api/guides/sync.
   */
  async listChangedEvents(params: {
    refreshToken: string;
    calendarId: string;
    syncToken?: string;
  }): Promise<GoogleCalendarEventsPage> {
    const calendar = this.calendarFor(params.refreshToken);
    const changes: GoogleCalendarEventChange[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    try {
      do {
        const { data } = await calendar.events.list({
          calendarId: params.calendarId,
          syncToken: params.syncToken,
          pageToken,
          singleEvents: true,
        });

        for (const item of data.items ?? []) {
          changes.push(toEventChange(item));
        }

        pageToken = data.nextPageToken ?? undefined;
        nextSyncToken = data.nextSyncToken ?? undefined;
      } while (pageToken);
    } catch (error) {
      if (isGone(error)) {
        throw new GoogleSyncTokenExpiredError();
      }
      throw error;
    }

    return { changes, nextSyncToken };
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Number(error.code) === 404
  );
}
