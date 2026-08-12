export class GoogleCalendarNotConnectedError extends Error {
  constructor() {
    super('Este profissional não tem uma conexão ativa com o Google Calendar.');
    this.name = 'GoogleCalendarNotConnectedError';
  }
}
