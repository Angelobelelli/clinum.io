import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { DisconnectGoogleCalendarUseCase } from '@/modules/google-calendar/application/use-cases/disconnect-google-calendar';
import { GoogleCalendarNotConnectedError } from '@/modules/google-calendar/application/use-cases/errors/google-calendar-not-connected-error';

describe('DisconnectGoogleCalendarUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let sut: DisconnectGoogleCalendarUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    sut = new DisconnectGoogleCalendarUseCase(connectionsRepository, gateway);
  });

  it('retorna GoogleCalendarNotConnectedError quando o member não tem conexão', async () => {
    const result = await sut.execute({ memberId: 'member-1' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(GoogleCalendarNotConnectedError);
    }
  });

  it('para o canal, revoga o acesso e remove a conexão', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'member-1' }),
    );
    connection.registrarCanalWatch({
      channelId: 'channel-1',
      channelToken: 'token-1',
      resourceId: 'resource-1',
      expiresAt: new Date(),
    });

    const result = await sut.execute({ memberId: 'member-1' });

    expect(result.isRight()).toBe(true);
    expect(gateway.stoppedChannels).toEqual([
      {
        refreshToken: connection.refreshToken,
        channelId: 'channel-1',
        resourceId: 'resource-1',
      },
    ]);
    expect(gateway.revokedTokens).toEqual([connection.refreshToken]);
    expect(connectionsRepository.items).toHaveLength(0);
  });

  it('remove a conexão mesmo se stopWatchChannel/revokeAccess falharem (best-effort)', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'member-1' }),
    );
    gateway.revokeAccess = () => Promise.reject(new Error('Google fora do ar'));

    const result = await sut.execute({ memberId: 'member-1' });

    expect(result.isRight()).toBe(true);
    expect(connectionsRepository.items).toHaveLength(0);
  });
});
