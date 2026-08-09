import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentoAuditLogsRepository } from '@/test/repositories/in-memory-agendamento-audit-logs-repository';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { AgendamentoNotTerminalError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-terminal-error';
import { RevertAgendamentoUseCase } from '@/modules/agenda/application/use-cases/revert-agendamento';

describe('RevertAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let agendamentoAuditLogsRepository: InMemoryAgendamentoAuditLogsRepository;
  let sut: RevertAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    agendamentoAuditLogsRepository =
      new InMemoryAgendamentoAuditLogsRepository();
    sut = new RevertAgendamentoUseCase(
      agendamentosRepository,
      agendamentoAuditLogsRepository,
    );
  });

  it('reverte um agendamento cancelado e grava o audit log', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'cancelado' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'admin-1', role: 'admin' },
      adminUserId: 'user-1',
      novoStatus: 'confirmado',
      motivo: 'Cliente ligou pedindo pra remarcar',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.status).toBe('confirmado');
    }
    expect(agendamentoAuditLogsRepository.items).toHaveLength(1);
    expect(agendamentoAuditLogsRepository.items[0]).toMatchObject({
      statusAnterior: 'cancelado',
      statusNovo: 'confirmado',
      motivo: 'Cliente ligou pedindo pra remarcar',
    });
  });

  it('retorna AgendamentoNotTerminalError quando o agendamento não está em estado terminal', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'agendado' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'admin-1', role: 'admin' },
      adminUserId: 'user-1',
      novoStatus: 'confirmado',
      motivo: 'Não deveria funcionar',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoNotTerminalError);
    }
  });

  it('retorna AgendamentoConflictError quando o horário foi ocupado enquanto estava cancelado', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        status: 'cancelado',
        dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      }),
    );
    await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        status: 'agendado',
        dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'admin-1', role: 'admin' },
      adminUserId: 'user-1',
      novoStatus: 'agendado',
      motivo: 'Tentando reverter horário ocupado',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoConflictError);
    }
  });
});
