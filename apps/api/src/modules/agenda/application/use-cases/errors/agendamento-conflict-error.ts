export class AgendamentoConflictError extends Error {
  constructor() {
    super('Já existe um agendamento para este profissional nesse horário.');
    this.name = 'AgendamentoConflictError';
  }
}
