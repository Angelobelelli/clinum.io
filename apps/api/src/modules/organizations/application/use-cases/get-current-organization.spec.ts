import { InMemoryTenantOrganizationsRepository } from '../../../../test/repositories/in-memory-tenant-organizations-repository';
import { Organization } from '../../enterprise/entities/organization';
import { OrganizationNotFoundError } from './errors/organization-not-found-error';
import { GetCurrentOrganizationUseCase } from './get-current-organization';

describe('GetCurrentOrganizationUseCase', () => {
  let organizationsRepository: InMemoryTenantOrganizationsRepository;
  let sut: GetCurrentOrganizationUseCase;

  beforeEach(() => {
    organizationsRepository = new InMemoryTenantOrganizationsRepository();
    sut = new GetCurrentOrganizationUseCase(organizationsRepository);
  });

  it('retorna a organização pelo id', async () => {
    const organization = Organization.create({
      name: 'Clínica Teste',
      slug: 'clinica-teste',
    });
    organizationsRepository.items.push(organization);

    const result = await sut.execute({
      organizationId: organization.id.toValue(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.organization.name).toBe('Clínica Teste');
    }
  });

  it('retorna erro se a organização não existir', async () => {
    const result = await sut.execute({ organizationId: 'id-inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(OrganizationNotFoundError);
    }
  });
});
