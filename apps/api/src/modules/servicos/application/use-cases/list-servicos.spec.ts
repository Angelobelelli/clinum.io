import { makeServico } from '@/test/factories/make-servico';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { ListServicosUseCase } from '@/modules/servicos/application/use-cases/list-servicos';

describe('ListServicosUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: ListServicosUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new ListServicosUseCase(servicosRepository);
  });

  it('lista os serviços da página pedida', async () => {
    await servicosRepository.create(makeServico({ nome: 'Serviço 1' }));
    await servicosRepository.create(makeServico({ nome: 'Serviço 2' }));

    const result = await sut.execute({ page: 1, perPage: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('respeita page/perPage', async () => {
    await servicosRepository.create(makeServico({ nome: 'Serviço 1' }));
    await servicosRepository.create(makeServico({ nome: 'Serviço 2' }));
    await servicosRepository.create(makeServico({ nome: 'Serviço 3' }));

    const result = await sut.execute({ page: 2, perPage: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(2);
  });
});
