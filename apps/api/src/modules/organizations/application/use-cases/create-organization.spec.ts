import { InMemoryTenantOrganizationsRepository } from '../../../../test/repositories/in-memory-tenant-organizations-repository';
import { CreateOrganizationUseCase } from './create-organization';

describe('CreateOrganizationUseCase', () => {
  let organizationsRepository: InMemoryTenantOrganizationsRepository;
  let sut: CreateOrganizationUseCase;

  beforeEach(() => {
    organizationsRepository = new InMemoryTenantOrganizationsRepository();
    sut = new CreateOrganizationUseCase(organizationsRepository);
  });

  it('cria uma organização', async () => {
    const { organization } = await sut.execute({
      name: 'Clínica Teste',
      slug: 'clinica-teste',
    });

    expect(organization.name).toBe('Clínica Teste');
    expect(organization.slug).toBe('clinica-teste');
    expect(organizationsRepository.items).toHaveLength(1);
  });
});
