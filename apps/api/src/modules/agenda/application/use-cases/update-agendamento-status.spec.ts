import { makeAgendamento } from '../../../../test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '../../../../test/repositories/in-memory-agendamentos-repository';
import { AgendamentoTerminalStateError } from './errors/agendamento-terminal-state-error';
import { UpdateAgendamentoStatusUseCase } from './update-agendamento-status';

describe('UpdateAgendamentoStatusUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let sut: UpdateAgendamentoStatusUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    sut = new UpdateAgendamentoStatusUseCase(agendamentosRepository);
  });

  it('marca o próprio agendamento como realizado', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-1' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'staff-1', role: 'staff' },
      status: 'realizado',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.status).toBe('realizado');
    }
  });

  it('retorna AgendamentoTerminalStateError quando já está em estado terminal', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'cancelado' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      status: 'falta',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoTerminalStateError);
    }
  });
});
