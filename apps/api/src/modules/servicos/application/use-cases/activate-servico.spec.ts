import { makeServico } from '@/test/factories/make-servico';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { ActivateServicoUseCase } from '@/modules/servicos/application/use-cases/activate-servico';

describe('ActivateServicoUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: ActivateServicoUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new ActivateServicoUseCase(servicosRepository);
  });

  it('ativa um serviço desativado', async () => {
    const servico = makeServico({ ativo: false });
    await servicosRepository.create(servico);

    const result = await sut.execute({ servicoId: servico.id.toValue() });

    expect(result.isRight()).toBe(true);
    expect(servicosRepository.items[0].ativo).toBe(true);
  });

  it('retorna ServicoNotFoundError quando o serviço não existe', async () => {
    const result = await sut.execute({ servicoId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });
});
