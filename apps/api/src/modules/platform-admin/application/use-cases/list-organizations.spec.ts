import { makeOrganization } from '../../../../test/factories/make-organization';
import { InMemoryOrganizationsRepository } from '../../../../test/repositories/in-memory-organizations-repository';
import { ListOrganizationsUseCase } from './list-organizations';

describe('ListOrganizationsUseCase', () => {
  let organizationsRepository: InMemoryOrganizationsRepository;
  let sut: ListOrganizationsUseCase;

  beforeEach(() => {
    organizationsRepository = new InMemoryOrganizationsRepository();
    sut = new ListOrganizationsUseCase(organizationsRepository);
  });

  it('lista organizations de qualquer tenant (cross-tenant de propósito)', async () => {
    organizationsRepository.items.push(makeOrganization({ slug: 'org-a' }));
    organizationsRepository.items.push(makeOrganization({ slug: 'org-b' }));

    const result = await sut.execute({ page: 1, perPage: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('respeita page/perPage', async () => {
    organizationsRepository.items.push(makeOrganization());
    organizationsRepository.items.push(makeOrganization());
    organizationsRepository.items.push(makeOrganization());

    const result = await sut.execute({ page: 2, perPage: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
  });
});
