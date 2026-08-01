export class AgendamentoNotTerminalError extends Error {
  constructor() {
    super(
      'Este agendamento não está em estado terminal — não há o que reverter.',
    );
    this.name = 'AgendamentoNotTerminalError';
  }
}
