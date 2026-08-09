import { makeServico } from '@/test/factories/make-servico';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { UpdateServicoUseCase } from '@/modules/servicos/application/use-cases/update-servico';

describe('UpdateServicoUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: UpdateServicoUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new UpdateServicoUseCase(servicosRepository);
  });

  it('atualiza os campos informados do serviço', async () => {
    const servico = makeServico({ nome: 'Nome Antigo', preco: 100 });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      servicoId: servico.id.toValue(),
      nome: 'Nome Novo',
      preco: 150,
    });

    expect(result.isRight()).toBe(true);
    expect(servicosRepository.items[0].nome).toBe('Nome Novo');
    expect(servicosRepository.items[0].preco).toBe(150);
  });

  it('retorna ServicoNotFoundError quando o serviço não existe', async () => {
    const result = await sut.execute({
      servicoId: 'inexistente',
      nome: 'Nome Novo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });

  it('propaga o erro de validação da entidade ao tentar preço negativo', async () => {
    const servico = makeServico();
    await servicosRepository.create(servico);

    await expect(
      sut.execute({ servicoId: servico.id.toValue(), preco: -10 }),
    ).rejects.toThrow('Preço não pode ser negativo');
  });

  it('propaga o erro de validação da entidade ao tentar duração menor que 1', async () => {
    const servico = makeServico();
    await servicosRepository.create(servico);

    await expect(
      sut.execute({ servicoId: servico.id.toValue(), duracaoMinutos: 0 }),
    ).rejects.toThrow('Duração deve ser no mínimo 1 minuto');
  });
});
