import { ProfissionaisRepository } from '../../modules/agenda/application/repositories/profissionais-repository';

export class InMemoryProfissionaisRepository implements ProfissionaisRepository {
  public existingIds = new Set<string>();

  existsInCurrentOrganization(profissionalId: string): Promise<boolean> {
    return Promise.resolve(this.existingIds.has(profissionalId));
  }
}
