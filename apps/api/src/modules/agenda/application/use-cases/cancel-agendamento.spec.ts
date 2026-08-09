import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { CancelAgendamentoUseCase } from '@/modules/agenda/application/use-cases/cancel-agendamento';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';

describe('CancelAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let sut: CancelAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    sut = new CancelAgendamentoUseCase(agendamentosRepository);
  });

  it('cancela um agendamento não terminal', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.status).toBe('cancelado');
    }
  });

  it('retorna AgendamentoNotFoundError quando o agendamento não existe', async () => {
    const result = await sut.execute({
      agendamentoId: 'inexistente',
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoNotFoundError);
    }
  });

  it('staff recebe NotOwnAgendamentoError ao cancelar agendamento de outro profissional', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-2' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'staff-1', role: 'staff' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotOwnAgendamentoError);
    }
  });

  it('retorna AgendamentoTerminalStateError quando já está em estado terminal', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'realizado' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoTerminalStateError);
    }
  });
});
