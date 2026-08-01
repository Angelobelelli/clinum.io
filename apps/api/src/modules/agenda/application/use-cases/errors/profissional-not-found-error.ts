export class ProfissionalNotFoundError extends Error {
  constructor() {
    super('Profissional não encontrado nesta organização.');
    this.name = 'ProfissionalNotFoundError';
  }
}
