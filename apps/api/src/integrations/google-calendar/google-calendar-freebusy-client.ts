import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleOAuthClient } from '@/integrations/google-calendar/google-oauth-client';

/** Wrapper sobre calendar.freebusy.query — consulta de disponibilidade. */
@Injectable()
export class GoogleCalendarFreeBusyClient {
  constructor(private readonly oauthClient: GoogleOAuthClient) {}

  async query(params: {
    refreshToken: string;
    calendarId: string;
    startIso: string;
    endIso: string;
  }): Promise<{ busy: boolean }> {
    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauthClient.authorizedClient(params.refreshToken),
    });

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.startIso,
        timeMax: params.endIso,
        items: [{ id: params.calendarId }],
      },
    });

    const busyIntervals = data.calendars?.[params.calendarId]?.busy ?? [];
    return { busy: busyIntervals.length > 0 };
  }
}
