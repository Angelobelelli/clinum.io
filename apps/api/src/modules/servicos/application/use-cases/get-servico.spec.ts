import { makeServico } from '@/test/factories/make-servico';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { GetServicoUseCase } from '@/modules/servicos/application/use-cases/get-servico';

describe('GetServicoUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: GetServicoUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new GetServicoUseCase(servicosRepository);
  });

  it('retorna o serviço pelo id', async () => {
    const servico = makeServico({ nome: 'Manicure' });
    await servicosRepository.create(servico);

    const result = await sut.execute({ servicoId: servico.id.toValue() });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.servico.nome).toBe('Manicure');
    }
  });

  it('retorna ServicoNotFoundError quando o serviço não existe', async () => {
    const result = await sut.execute({ servicoId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });
});
