import { makeMember } from '@/test/factories/make-member';
import { InMemoryMembersRepository } from '@/test/repositories/in-memory-members-repository';
import { MemberNotFoundError } from '@/modules/members/application/use-cases/errors/member-not-found-error';
import { UpdateMemberVinculoUseCase } from '@/modules/members/application/use-cases/update-member-vinculo';

describe('UpdateMemberVinculoUseCase', () => {
  let membersRepository: InMemoryMembersRepository;
  let sut: UpdateMemberVinculoUseCase;

  beforeEach(() => {
    membersRepository = new InMemoryMembersRepository();
    sut = new UpdateMemberVinculoUseCase(membersRepository);
  });

  it('atualiza tipoVinculo e status', async () => {
    const member = makeMember({ tipoVinculo: null, status: 'ativo' });
    membersRepository.items.push(member);

    const result = await sut.execute({
      memberId: member.id.toValue(),
      tipoVinculo: 'funcionario',
      status: 'inativo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.member.tipoVinculo).toBe('funcionario');
      expect(result.value.member.status).toBe('inativo');
    }
  });

  it('atualiza só o campo informado, mantendo o outro', async () => {
    const member = makeMember({ tipoVinculo: 'funcionario', status: 'ativo' });
    membersRepository.items.push(member);

    const result = await sut.execute({
      memberId: member.id.toValue(),
      status: 'inativo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.member.tipoVinculo).toBe('funcionario');
      expect(result.value.member.status).toBe('inativo');
    }
  });

  it('retorna MemberNotFoundError quando o member não existe', async () => {
    const result = await sut.execute({
      memberId: 'inexistente',
      status: 'inativo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(MemberNotFoundError);
    }
  });
});
