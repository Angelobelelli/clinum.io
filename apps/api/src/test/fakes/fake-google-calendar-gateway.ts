import { randomUUID } from 'node:crypto';
import {
  GoogleCalendarChangesResult,
  GoogleCalendarEventData,
  GoogleCalendarGateway,
} from '@/modules/google-calendar/application/ports/google-calendar-gateway';

let eventIdSequence = 0;

/**
 * Fake em memória de GoogleCalendarGateway — usado pelos specs de
 * use-cases de modules/google-calendar/ (nunca chama a API real do
 * Google). Comportamento configurável via campos públicos.
 */
export class FakeGoogleCalendarGateway implements GoogleCalendarGateway {
  public authUrl = 'https://accounts.google.com/o/oauth2/fake-auth-url';
  public exchangeResult = {
    refreshToken: 'fake-refresh-token',
    googleAccountEmail: 'profissional@example.com',
  };
  public busy = false;
  public shouldFailFreeBusy = false;
  public watchResult = {
    channelId: 'fake-channel-id',
    channelToken: 'fake-channel-token',
    resourceId: 'fake-resource-id',
    expiresAt: new Date('2026-10-01T00:00:00.000Z'),
  };
  public changesResult: GoogleCalendarChangesResult = { changes: [] };

  public upsertedEvents: {
    googleEventId?: string;
    event: GoogleCalendarEventData;
  }[] = [];
  public deletedEventIds: string[] = [];
  public revokedTokens: string[] = [];
  public stoppedChannels: { channelId: string; resourceId: string }[] = [];
  public watchChannelsCreated = 0;

  buildAuthUrl(): string {
    return this.authUrl;
  }

  exchangeCodeForTokens(): Promise<{
    refreshToken: string;
    googleAccountEmail: string;
  }> {
    return Promise.resolve(this.exchangeResult);
  }

  revokeAccess(refreshToken: string): Promise<void> {
    this.revokedTokens.push(refreshToken);
    return Promise.resolve();
  }

  upsertEvent(params: {
    googleEventId?: string;
    event: GoogleCalendarEventData;
  }): Promise<{ googleEventId: string }> {
    this.upsertedEvents.push(params);
    const googleEventId = params.googleEventId ?? `event-${++eventIdSequence}`;
    return Promise.resolve({ googleEventId });
  }

  deleteEvent(params: { googleEventId: string }): Promise<void> {
    this.deletedEventIds.push(params.googleEventId);
    return Promise.resolve();
  }

  hasConflict(): Promise<boolean> {
    if (this.shouldFailFreeBusy) {
      return Promise.reject(new Error('Falha simulada na API do Google.'));
    }
    return Promise.resolve(this.busy);
  }

  createWatchChannel(): Promise<{
    channelId: string;
    channelToken: string;
    resourceId: string;
    expiresAt: Date;
  }> {
    this.watchChannelsCreated += 1;
    // channelId/resourceId sempre únicos por chamada — watchChannelId tem
    // constraint @unique no banco, e testes e2e (que persistem de verdade)
    // rodam múltiplas vezes contra o mesmo Postgres sem limpar dados entre
    // execuções, então um valor fixo colidiria entre rodadas.
    this.watchResult = {
      ...this.watchResult,
      channelId: `fake-channel-${randomUUID()}`,
      resourceId: `fake-resource-${randomUUID()}`,
    };
    return Promise.resolve(this.watchResult);
  }

  stopWatchChannel(params: {
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    this.stoppedChannels.push(params);
    return Promise.resolve();
  }

  listChanges(): Promise<GoogleCalendarChangesResult> {
    return Promise.resolve(this.changesResult);
  }
}
