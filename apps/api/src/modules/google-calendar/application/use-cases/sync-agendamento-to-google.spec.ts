import { FakeAgendamentoExternalSyncTarget } from '@/test/fakes/fake-agendamento-external-sync-target';
import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { SyncAgendamentoToGoogleUseCase } from '@/modules/google-calendar/application/use-cases/sync-agendamento-to-google';

describe('SyncAgendamentoToGoogleUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let syncTarget: FakeAgendamentoExternalSyncTarget;
  let sut: SyncAgendamentoToGoogleUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    syncTarget = new FakeAgendamentoExternalSyncTarget();
    sut = new SyncAgendamentoToGoogleUseCase(
      connectionsRepository,
      gateway,
      syncTarget,
    );
  });

  it('não faz nada quando o profissional não tem conexão ativa', async () => {
    const agendamento = syncTarget.seed({ profissionalId: 'profissional-1' });

    await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      profissionalId: 'profissional-1',
      type: 'upsert',
      snapshot: {
        patientNome: 'Maria',
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
      },
    });

    expect(gateway.upsertedEvents).toHaveLength(0);
  });

  it('cria o evento no Google e vincula o googleEventId ao Agendamento', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    const agendamento = syncTarget.seed({ profissionalId: 'profissional-1' });

    await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      profissionalId: 'profissional-1',
      type: 'upsert',
      snapshot: {
        patientNome: 'Maria',
        servicoNome: 'Corte',
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
      },
    });

    expect(gateway.upsertedEvents).toHaveLength(1);
    expect(gateway.upsertedEvents[0].event.summary).toBe('Maria — Corte');
    expect(syncTarget.linkCalls).toHaveLength(1);
    expect(agendamento.googleEventId).toBeTruthy();
    expect(agendamento.syncedAt).toBeInstanceOf(Date);
  });

  it('atualiza (não recria) o evento quando o Agendamento já tem googleEventId', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    const agendamento = syncTarget.seed({ profissionalId: 'profissional-1' });
    agendamento.registrarSyncGoogle('evento-existente', new Date());

    await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      profissionalId: 'profissional-1',
      type: 'upsert',
      snapshot: {
        patientNome: 'Maria',
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
      },
    });

    expect(gateway.upsertedEvents[0].googleEventId).toBe('evento-existente');
  });

  it('deleta o evento no Google ao cancelar', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    const agendamento = syncTarget.seed({ profissionalId: 'profissional-1' });
    agendamento.registrarSyncGoogle('evento-1', new Date());

    await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      profissionalId: 'profissional-1',
      type: 'cancel',
    });

    expect(gateway.deletedEventIds).toEqual(['evento-1']);
  });

  it('remove o evento da agenda do profissional anterior ao remarcar para outro', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-antigo' }),
    );
    const agendamento = syncTarget.seed({
      profissionalId: 'profissional-novo',
    });
    agendamento.registrarSyncGoogle('evento-1', new Date());

    await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      profissionalId: 'profissional-novo',
      previousProfissionalId: 'profissional-antigo',
      type: 'upsert',
      snapshot: {
        patientNome: 'Maria',
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
      },
    });

    expect(gateway.deletedEventIds).toEqual(['evento-1']);
  });
});
