/**
 * DECISÃO DE MODELAGEM (não pedida explicitamente): watchChannelId sozinho
 * identifica a conexão, mas não autentica a notificação — qualquer um que
 * adivinhasse um channelId conseguiria injetar processamento falso. Este
 * erro dispara quando o X-Goog-Channel-Token recebido não bate com
 * GoogleCalendarConnection.watchChannelToken salvo.
 */
export class InvalidWatchChannelTokenError extends Error {
  constructor() {
    super('Token do canal de notificação inválido.');
    this.name = 'InvalidWatchChannelTokenError';
  }
}
