import { makeMember } from '../../../../test/factories/make-member';
import { InMemoryMembersRepository } from '../../../../test/repositories/in-memory-members-repository';
import { ListMembersUseCase } from './list-members';

describe('ListMembersUseCase', () => {
  let membersRepository: InMemoryMembersRepository;
  let sut: ListMembersUseCase;

  beforeEach(() => {
    membersRepository = new InMemoryMembersRepository();
    sut = new ListMembersUseCase(membersRepository);
  });

  it('lista os members da página pedida', async () => {
    membersRepository.items.push(makeMember({ role: 'owner' }));
    membersRepository.items.push(makeMember({ role: 'staff' }));

    const result = await sut.execute({ page: 1, perPage: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('respeita page/perPage', async () => {
    membersRepository.items.push(makeMember());
    membersRepository.items.push(makeMember());
    membersRepository.items.push(makeMember());

    const result = await sut.execute({ page: 2, perPage: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
  });
});
