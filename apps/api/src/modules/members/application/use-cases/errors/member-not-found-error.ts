export class MemberNotFoundError extends Error {
  constructor() {
    super('Member não encontrado.');
    this.name = 'MemberNotFoundError';
  }
}
