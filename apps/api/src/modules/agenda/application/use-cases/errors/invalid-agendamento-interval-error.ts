export class InvalidAgendamentoIntervalError extends Error {
  constructor() {
    super('dataHoraFim deve ser depois de dataHoraInicio.');
    this.name = 'InvalidAgendamentoIntervalError';
  }
}
