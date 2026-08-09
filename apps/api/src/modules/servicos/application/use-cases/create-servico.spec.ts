import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { CreateServicoUseCase } from '@/modules/servicos/application/use-cases/create-servico';

describe('CreateServicoUseCase', () => {
  let servicosRepository: InMemoryServicosRepository;
  let sut: CreateServicoUseCase;

  beforeEach(() => {
    servicosRepository = new InMemoryServicosRepository();
    sut = new CreateServicoUseCase(servicosRepository);
  });

  it('cria um serviço já ativo por padrão', async () => {
    const { servico } = await sut.execute({
      organizationId: 'org-1',
      nome: 'Corte de cabelo',
      duracaoMinutos: 30,
      preco: 80,
    });

    expect(servico.nome).toBe('Corte de cabelo');
    expect(servico.duracaoMinutos).toBe(30);
    expect(servico.preco).toBe(80);
    expect(servico.ativo).toBe(true);
    expect(servicosRepository.items).toHaveLength(1);
    expect(servicosRepository.items[0]).toBe(servico);
  });
});
