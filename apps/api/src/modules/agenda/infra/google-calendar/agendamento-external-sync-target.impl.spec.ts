import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { AgendamentoExternalSyncTargetImpl } from '@/modules/agenda/infra/google-calendar/agendamento-external-sync-target.impl';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';

describe('AgendamentoExternalSyncTargetImpl', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let sut: AgendamentoExternalSyncTargetImpl;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    sut = new AgendamentoExternalSyncTargetImpl(agendamentosRepository);
  });

  it('findByGoogleEventId acha o agendamento vinculado', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());
    agendamento.registrarSyncGoogle('evento-1', new Date());

    const found = await sut.findByGoogleEventId('evento-1');

    expect(found?.id.toValue()).toBe(agendamento.id.toValue());
  });

  it('applyExternalUpdate retorna AgendamentoNotFoundError quando o id não existe', async () => {
    const result = await sut.applyExternalUpdate({
      agendamentoId: 'inexistente',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoNotFoundError);
    }
  });

  it('applyExternalUpdate recusa quando o agendamento já está em estado terminal', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'cancelado' }),
    );

    const result = await sut.applyExternalUpdate({
      agendamentoId: agendamento.id.toValue(),
      status: 'cancelado',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoTerminalStateError);
    }
  });

  it('applyExternalUpdate aplica a nova data quando o agendamento é válido', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());
    const novoInicio = new Date('2026-09-01T14:00:00.000Z');
    const novoFim = new Date('2026-09-01T15:00:00.000Z');

    const result = await sut.applyExternalUpdate({
      agendamentoId: agendamento.id.toValue(),
      dataHoraInicio: novoInicio,
      dataHoraFim: novoFim,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.dataHoraInicio).toEqual(novoInicio);
      expect(result.value.agendamento.dataHoraFim).toEqual(novoFim);
    }
  });

  it('linkGoogleEvent grava googleEventId e syncedAt', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());
    const syncedAt = new Date('2026-09-01T10:00:00.000Z');

    await sut.linkGoogleEvent({
      agendamentoId: agendamento.id.toValue(),
      googleEventId: 'evento-1',
      syncedAt,
    });

    const updated = await agendamentosRepository.findById(
      agendamento.id.toValue(),
    );
    expect(updated?.googleEventId).toBe('evento-1');
    expect(updated?.syncedAt).toEqual(syncedAt);
  });
});
