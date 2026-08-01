export class NotOwnAgendamentoError extends Error {
  constructor() {
    super('Você só pode acessar os próprios agendamentos.');
    this.name = 'NotOwnAgendamentoError';
  }
}
