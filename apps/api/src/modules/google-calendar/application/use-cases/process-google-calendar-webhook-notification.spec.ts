import { FakeAgendamentoExternalSyncTarget } from '@/test/fakes/fake-agendamento-external-sync-target';
import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { ProcessGoogleCalendarWebhookNotificationUseCase } from '@/modules/google-calendar/application/use-cases/process-google-calendar-webhook-notification';

describe('ProcessGoogleCalendarWebhookNotificationUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let syncTarget: FakeAgendamentoExternalSyncTarget;
  let sut: ProcessGoogleCalendarWebhookNotificationUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    syncTarget = new FakeAgendamentoExternalSyncTarget();
    sut = new ProcessGoogleCalendarWebhookNotificationUseCase(
      connectionsRepository,
      gateway,
      syncTarget,
    );
  });

  it('não faz nada se a conexão não existe mais', async () => {
    await sut.execute({ connectionId: 'inexistente' });
    // não deveria lançar
  });

  it('ignora eventos sem vínculo com nenhum Agendamento (sem extendedProperties)', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    gateway.changesResult = {
      changes: [
        {
          googleEventId: 'evento-solto',
          status: 'confirmed',
          updatedIso: new Date('2026-09-01T10:00:00.000Z').toISOString(),
        },
      ],
      nextSyncToken: 'novo-sync-token',
    };

    await sut.execute({ connectionId: connection.id.toValue() });

    expect(syncTarget.items).toHaveLength(0);
  });

  it('ignora a mudança quando é eco do nosso próprio último sync', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    const agendamento = syncTarget.seed();
    const syncedAt = new Date('2026-09-01T10:00:00.000Z');
    agendamento.registrarSyncGoogle('evento-1', syncedAt);

    gateway.changesResult = {
      changes: [
        {
          googleEventId: 'evento-1',
          status: 'confirmed',
          agendamentoId: agendamento.id.toValue(),
          // updatedIso não é mais recente que o nosso último syncedAt -> eco.
          updatedIso: syncedAt.toISOString(),
        },
      ],
    };

    await sut.execute({ connectionId: connection.id.toValue() });

    expect(agendamento.status).toBe('agendado');
  });

  it('aplica uma mudança externa genuína de horário', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    const agendamento = syncTarget.seed();
    agendamento.registrarSyncGoogle(
      'evento-1',
      new Date('2026-09-01T09:00:00.000Z'),
    );
    const novoInicio = new Date('2026-09-01T14:00:00.000Z');
    const novoFim = new Date('2026-09-01T15:00:00.000Z');

    gateway.changesResult = {
      changes: [
        {
          googleEventId: 'evento-1',
          status: 'confirmed',
          agendamentoId: agendamento.id.toValue(),
          dataHoraInicio: novoInicio,
          dataHoraFim: novoFim,
          // updatedIso mais recente que o nosso último syncedAt (09:00) -> mudança externa genuína.
          updatedIso: new Date('2026-09-01T13:00:00.000Z').toISOString(),
        },
      ],
    };

    await sut.execute({ connectionId: connection.id.toValue() });

    expect(agendamento.dataHoraInicio).toEqual(novoInicio);
    expect(agendamento.dataHoraFim).toEqual(novoFim);
  });

  it('marca como cancelado quando o evento é removido diretamente no Google', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    const agendamento = syncTarget.seed();
    agendamento.registrarSyncGoogle(
      'evento-1',
      new Date('2026-09-01T09:00:00.000Z'),
    );

    gateway.changesResult = {
      changes: [
        {
          googleEventId: 'evento-1',
          status: 'cancelled',
          agendamentoId: agendamento.id.toValue(),
          // updatedIso mais recente que o nosso último syncedAt (09:00) -> mudança externa genuína.
          updatedIso: new Date('2026-09-01T10:00:00.000Z').toISOString(),
        },
      ],
    };

    await sut.execute({ connectionId: connection.id.toValue() });

    expect(agendamento.status).toBe('cancelado');
  });

  it('atualiza o syncToken da conexão após processar', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    gateway.changesResult = { changes: [], nextSyncToken: 'token-novo' };

    await sut.execute({ connectionId: connection.id.toValue() });

    const updated = await connectionsRepository.findById(
      connection.id.toValue(),
    );
    expect(updated?.syncToken).toBe('token-novo');
  });
});
