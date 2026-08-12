import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { FindExpiringGoogleCalendarWatchChannelsUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channels';
import { RenewGoogleCalendarWatchChannelUseCase } from '@/modules/google-calendar/application/use-cases/renew-google-calendar-watch-channel';

describe('FindExpiringGoogleCalendarWatchChannelsUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let sut: FindExpiringGoogleCalendarWatchChannelsUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    sut = new FindExpiringGoogleCalendarWatchChannelsUseCase(
      connectionsRepository,
    );
  });

  it('só seleciona conexões com canal expirando dentro da margem', async () => {
    const expirandoLogo = makeGoogleCalendarConnection({
      organizationId: 'org-1',
    });
    expirandoLogo.registrarCanalWatch({
      channelId: 'c1',
      channelToken: 't1',
      resourceId: 'r1',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 dia
    });
    const expirandoLonge = makeGoogleCalendarConnection({
      organizationId: 'org-2',
    });
    expirandoLonge.registrarCanalWatch({
      channelId: 'c2',
      channelToken: 't2',
      resourceId: 'r2',
      expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 dias
    });
    await connectionsRepository.create(expirandoLogo);
    await connectionsRepository.create(expirandoLonge);

    const { connections } = await sut.execute();

    expect(connections).toEqual([
      {
        connectionId: expirandoLogo.id.toValue(),
        organizationId: 'org-1',
      },
    ]);
  });
});

describe('RenewGoogleCalendarWatchChannelUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let sut: RenewGoogleCalendarWatchChannelUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    sut = new RenewGoogleCalendarWatchChannelUseCase(
      connectionsRepository,
      gateway,
    );
  });

  it('cria um novo canal e substitui os dados de watch da conexão', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection(),
    );
    connection.registrarCanalWatch({
      channelId: 'canal-antigo',
      channelToken: 'token-antigo',
      resourceId: 'resource-antigo',
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    await sut.execute({ connectionId: connection.id.toValue() });

    expect(gateway.watchChannelsCreated).toBe(1);
    expect(connection.watchChannelId).toBe(gateway.watchResult.channelId);
    expect(connection.watchExpiresAt).toEqual(gateway.watchResult.expiresAt);
  });

  it('não lança quando a conexão não existe mais', async () => {
    await sut.execute({ connectionId: 'inexistente' });
    expect(gateway.watchChannelsCreated).toBe(0);
  });
});
