export class ServicoInativoError extends Error {
  constructor() {
    super('Não é possível usar um serviço desativado neste agendamento.');
    this.name = 'ServicoInativoError';
  }
}
