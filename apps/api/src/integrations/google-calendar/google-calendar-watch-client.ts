import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleOAuthClient } from '@/integrations/google-calendar/google-oauth-client';
import type { GoogleWatchChannelResult } from '@/integrations/google-calendar/google-calendar-integration.types';

/**
 * Wrapper sobre calendar.events.watch/channels.stop — canal de notificação
 * push. channelId/channelToken são gerados por quem chama (ver
 * modules/google-calendar/infra/gateways/google-calendar-gateway.impl.ts,
 * que é quem sabe gerar/guardar esses identificadores) — este client só
 * repassa para a API do Google.
 */
@Injectable()
export class GoogleCalendarWatchClient {
  constructor(private readonly oauthClient: GoogleOAuthClient) {}

  async watch(params: {
    refreshToken: string;
    calendarId: string;
    webhookUrl: string;
    channelId: string;
    channelToken: string;
  }): Promise<GoogleWatchChannelResult> {
    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauthClient.authorizedClient(params.refreshToken),
    });

    const { data } = await calendar.events.watch({
      calendarId: params.calendarId,
      requestBody: {
        id: params.channelId,
        type: 'web_hook',
        address: params.webhookUrl,
        token: params.channelToken,
      },
    });

    if (!data.id || !data.resourceId || !data.expiration) {
      throw new Error(
        'Resposta incompleta do Google ao criar o canal de watch.',
      );
    }

    return {
      channelId: data.id,
      resourceId: data.resourceId,
      expirationEpochMs: Number(data.expiration),
    };
  }

  async stop(params: {
    refreshToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauthClient.authorizedClient(params.refreshToken),
    });

    await calendar.channels.stop({
      requestBody: { id: params.channelId, resourceId: params.resourceId },
    });
  }
}
