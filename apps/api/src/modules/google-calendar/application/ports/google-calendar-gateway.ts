/**
 * Porta que os use-cases de modules/google-calendar/ consomem — vocabulário
 * de NEGÓCIO (Agendamento, syncVersion), diferente dos tipos genéricos de
 * integrations/google-calendar/. Implementada por
 * infra/gateways/google-calendar-gateway.impl.ts, que traduz entre os dois
 * mundos.
 */

export interface GoogleCalendarEventData {
  summary: string;
  description?: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  agendamentoId: string;
  /**
   * ISO exato — o MESMO valor que o chamador vai persistir em
   * Agendamento.syncedAt logo em seguida. Gravado em
   * extendedProperties.private do evento no Google e comparado depois pelo
   * processamento do webhook (proteção contra eco, ver
   * ProcessGoogleCalendarWebhookNotificationUseCase).
   */
  syncVersionIso: string;
}

export interface GoogleCalendarChangedEvent {
  googleEventId: string;
  status: 'confirmed' | 'cancelled';
  dataHoraInicio?: Date;
  dataHoraFim?: Date;
  /** Ausente se o evento não tiver sido criado por nós (extendedProperties.private ausente). */
  agendamentoId?: string;
  syncVersionIso?: string;
}

export interface GoogleCalendarChangesResult {
  changes: GoogleCalendarChangedEvent[];
  nextSyncToken?: string;
}

export abstract class GoogleCalendarGateway {
  abstract buildAuthUrl(state: string): string;

  abstract exchangeCodeForTokens(
    code: string,
  ): Promise<{ refreshToken: string; googleAccountEmail: string }>;

  /** Best-effort — quem chama trata falha como aviso, não como erro fatal (ver DisconnectGoogleCalendarUseCase). */
  abstract revokeAccess(refreshToken: string): Promise<void>;

  /**
   * Cria ou atualiza o evento, dependendo de `googleEventId` estar
   * presente. accessToken nunca é persistido pelo módulo de negócio — este
   * gateway sempre deriva um access token novo a partir do refreshToken
   * salvo.
   */
  abstract upsertEvent(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId?: string;
    event: GoogleCalendarEventData;
  }): Promise<{ googleEventId: string }>;

  abstract deleteEvent(params: {
    refreshToken: string;
    calendarId: string;
    googleEventId: string;
  }): Promise<void>;

  /** `true` = calendário do profissional indica ocupado nesse intervalo. */
  abstract hasConflict(params: {
    refreshToken: string;
    calendarId: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
  }): Promise<boolean>;

  abstract createWatchChannel(params: {
    refreshToken: string;
    calendarId: string;
  }): Promise<{
    channelId: string;
    channelToken: string;
    resourceId: string;
    expiresAt: Date;
  }>;

  /** Best-effort — quem chama trata falha como aviso (ver DisconnectGoogleCalendarUseCase). */
  abstract stopWatchChannel(params: {
    refreshToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void>;

  abstract listChanges(params: {
    refreshToken: string;
    calendarId: string;
    syncToken?: string;
  }): Promise<GoogleCalendarChangesResult>;
}
