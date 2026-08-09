export class OrganizationNotFoundError extends Error {
  constructor() {
    super('Organização não encontrada.');
    this.name = 'OrganizationNotFoundError';
  }
}
