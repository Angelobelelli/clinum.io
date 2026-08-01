export class AgendamentoTerminalStateError extends Error {
  constructor() {
    super(
      'Agendamento em estado terminal, use o endpoint de reversão (/agendamentos/:id/reverter).',
    );
    this.name = 'AgendamentoTerminalStateError';
  }
}
