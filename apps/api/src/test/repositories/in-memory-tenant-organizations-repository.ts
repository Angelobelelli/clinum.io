import { OrganizationsRepository } from '@/modules/organizations/application/repositories/organizations-repository';
import { Organization } from '@/modules/organizations/enterprise/entities/organization';

/**
 * Nome distinto de in-memory-organizations-repository.ts (que já existia e
 * pertence ao read-model cross-tenant de platform-admin/, com seu próprio
 * OrganizationsRepository/Organization — bounded context separado, mesmo
 * nome de classe, path diferente). Este aqui é o fake do OrganizationsRepository
 * de modules/organizations/ (o próprio tenant lendo/criando a si mesmo).
 */
export class InMemoryTenantOrganizationsRepository implements OrganizationsRepository {
  public items: Organization[] = [];

  findById(id: string): Promise<Organization | null> {
    const organization = this.items.find((item) => item.id.toValue() === id);

    return Promise.resolve(organization ?? null);
  }

  create(organization: Organization): Promise<Organization> {
    this.items.push(organization);

    return Promise.resolve(organization);
  }
}
