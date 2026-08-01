export class ServicoNotFoundError extends Error {
  constructor() {
    super('Serviço não encontrado.');
    this.name = 'ServicoNotFoundError';
  }
}
