import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

/**
 * NUNCA inclui refreshToken/refreshTokenEncrypted nem watchChannelToken
 * (usado só para autenticar o webhook, ver
 * AcknowledgeGoogleCalendarWebhookUseCase) — segredos não saem por HTTP.
 */
export class GoogleCalendarConnectionPresenter {
  static toHTTP(connection: GoogleCalendarConnection) {
    return {
      id: connection.id.toValue(),
      memberId: connection.memberId,
      googleAccountEmail: connection.googleAccountEmail,
      calendarId: connection.calendarId,
      watchExpiresAt: connection.watchExpiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}
