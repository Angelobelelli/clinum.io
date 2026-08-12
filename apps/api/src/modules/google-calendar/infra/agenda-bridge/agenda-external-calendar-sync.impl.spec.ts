import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { FakeGoogleCalendarQueueProducer } from '@/test/fakes/fake-google-calendar-queue-producer';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { CheckFreeBusyConflictUseCase } from '@/modules/google-calendar/application/use-cases/check-free-busy-conflict';
import { AgendaExternalCalendarSyncImpl } from '@/modules/google-calendar/infra/agenda-bridge/agenda-external-calendar-sync.impl';

describe('AgendaExternalCalendarSyncImpl', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let queueProducer: FakeGoogleCalendarQueueProducer;
  let sut: AgendaExternalCalendarSyncImpl;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    queueProducer = new FakeGoogleCalendarQueueProducer();
    sut = new AgendaExternalCalendarSyncImpl(
      connectionsRepository,
      new CheckFreeBusyConflictUseCase(connectionsRepository, gateway),
      queueProducer,
    );
  });

  it('checkFreeBusyConflict repassa o resultado do use-case', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    gateway.busy = true;

    const conflict = await sut.checkFreeBusyConflict({
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date(),
      dataHoraFim: new Date(),
    });

    expect(conflict).toBe(true);
  });

  it('enqueueSync repassa o payload pro producer quando o profissional tem conexão', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );

    await sut.enqueueSync({
      agendamentoId: 'agendamento-1',
      profissionalId: 'profissional-1',
      type: 'cancel',
    });

    expect(queueProducer.syncCalls).toEqual([
      {
        agendamentoId: 'agendamento-1',
        profissionalId: 'profissional-1',
        type: 'cancel',
      },
    ]);
  });

  it('enqueueSync não enfileira nada quando nem o profissional atual nem o anterior têm conexão', async () => {
    await sut.enqueueSync({
      agendamentoId: 'agendamento-1',
      profissionalId: 'profissional-sem-conexao',
      previousProfissionalId: 'outro-sem-conexao',
      type: 'upsert',
    });

    expect(queueProducer.syncCalls).toHaveLength(0);
  });

  it('enqueueSync enfileira quando só o profissional ANTERIOR tem conexão (remarcação)', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-antigo' }),
    );

    await sut.enqueueSync({
      agendamentoId: 'agendamento-1',
      profissionalId: 'profissional-novo-sem-conexao',
      previousProfissionalId: 'profissional-antigo',
      type: 'upsert',
    });

    expect(queueProducer.syncCalls).toHaveLength(1);
  });
});
