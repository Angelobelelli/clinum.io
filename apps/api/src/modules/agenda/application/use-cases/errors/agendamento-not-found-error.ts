export class AgendamentoNotFoundError extends Error {
  constructor() {
    super('Agendamento não encontrado.');
    this.name = 'AgendamentoNotFoundError';
  }
}
