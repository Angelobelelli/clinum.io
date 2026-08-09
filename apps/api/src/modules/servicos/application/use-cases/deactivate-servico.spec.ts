import { makeServico } from '@/test/factories/make-servico';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { DeactivateServicoUseCase } from '@/modules/servicos/application/use-cases/deactivate-servico';

describe('DeactivateServicoUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: DeactivateServicoUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new DeactivateServicoUseCase(servicosRepository);
  });

  it('desativa um serviço ativo', async () => {
    const servico = makeServico({ ativo: true });
    await servicosRepository.create(servico);

    const result = await sut.execute({ servicoId: servico.id.toValue() });

    expect(result.isRight()).toBe(true);
    expect(servicosRepository.items[0].ativo).toBe(false);
  });

  it('retorna ServicoNotFoundError quando o serviço não existe', async () => {
    const result = await sut.execute({ servicoId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });
});
