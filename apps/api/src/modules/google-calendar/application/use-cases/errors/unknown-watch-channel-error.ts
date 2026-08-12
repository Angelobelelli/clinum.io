export class UnknownWatchChannelError extends Error {
  constructor() {
    super('Nenhuma conexão encontrada para este canal de notificação.');
    this.name = 'UnknownWatchChannelError';
  }
}
