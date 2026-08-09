import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { ListAgendamentosUseCase } from '@/modules/agenda/application/use-cases/list-agendamentos';

describe('ListAgendamentosUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let sut: ListAgendamentosUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    sut = new ListAgendamentosUseCase(agendamentosRepository);
  });

  it('staff só vê os próprios agendamentos', async () => {
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-2' }),
    );

    const result = await sut.execute({
      caller: { id: 'staff-1', role: 'staff' },
      page: 1,
      perPage: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].profissionalId).toBe('staff-1');
    expect(result.total).toBe(1);
  });

  it('reception vê agendamentos de todos os profissionais', async () => {
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-2' }),
    );

    const result = await sut.execute({
      caller: { id: 'reception-1', role: 'reception' },
      page: 1,
      perPage: 20,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('filtra por profissionalId quando informado por um papel não-staff', async () => {
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-2' }),
    );

    const result = await sut.execute({
      caller: { id: 'owner-1', role: 'owner' },
      profissionalId: 'staff-2',
      page: 1,
      perPage: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].profissionalId).toBe('staff-2');
  });

  it('respeita page/perPage', async () => {
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );
    await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );

    const result = await sut.execute({
      caller: { id: 'owner-1', role: 'owner' },
      page: 2,
      perPage: 2,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
  });
});
