export class HealthRecordNotFoundError extends Error {
  constructor() {
    super('Ficha de saúde não encontrada.');
    this.name = 'HealthRecordNotFoundError';
  }
}
