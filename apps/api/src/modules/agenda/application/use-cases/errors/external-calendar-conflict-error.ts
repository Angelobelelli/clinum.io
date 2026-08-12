/**
 * Nome genérico (não menciona "Google") de propósito — agenda/ não conhece
 * qual calendário externo está por trás de AgendaExternalCalendarSyncPort.
 */
export class ExternalCalendarConflictError extends Error {
  constructor() {
    super(
      'O profissional já tem um compromisso no calendário externo conectado nesse horário.',
    );
    this.name = 'ExternalCalendarConflictError';
  }
}
