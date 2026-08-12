/**
 * Tipos genéricos do adapter da API do Google Calendar — nenhum conceito de
 * negócio (Agendamento, Patient, etc.) aparece aqui, só o vocabulário da
 * própria API do Google. Consumidos por
 * modules/google-calendar/infra/gateways/google-calendar-gateway.impl.ts,
 * que traduz entre isto e os tipos de application/ports/.
 */

export interface GoogleOAuthTokens {
  accessToken: string;
  /** Só vem preenchido na primeira troca (exchangeCodeForTokens). */
  refreshToken?: string;
  /** Epoch ms. */
  expiryDate: number;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  /**
   * Gravado em extendedProperties.private do evento — usado pelo módulo de
   * negócio pra marcar a origem do write (proteção contra eco, ver
   * ProcessGoogleCalendarWebhookNotificationUseCase). Opaco para este
   * adapter.
   */
  extendedPrivateProperties: Record<string, string>;
}

export interface GoogleCalendarEventChange {
  googleEventId: string;
  status: 'confirmed' | 'cancelled';
  startIso?: string;
  endIso?: string;
  /** updated do evento no Google, ISO 8601. */
  updatedIso: string;
  extendedPrivateProperties?: Record<string, string>;
}

export interface GoogleCalendarEventsPage {
  changes: GoogleCalendarEventChange[];
  /** Ausente só se a página não fechou o delta completo (não deveria acontecer, já paginamos até o fim). */
  nextSyncToken?: string;
}

export interface GoogleWatchChannelResult {
  channelId: string;
  resourceId: string;
  expirationEpochMs: number;
}

/**
 * O syncToken usado numa chamada a `events.list` expirou ou é inválido
 * (Google responde 410 Gone) — quem chama precisa descartar o syncToken
 * salvo e recomeçar com uma sincronização completa. Erro de integração
 * (não de domínio), por isso vive aqui e não em modules/google-calendar.
 */
export class GoogleSyncTokenExpiredError extends Error {
  constructor() {
    super('O syncToken do Google Calendar expirou ou é inválido (410 Gone).');
    this.name = 'GoogleSyncTokenExpiredError';
  }
}
