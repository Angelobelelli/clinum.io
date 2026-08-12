import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { HandleGoogleOauthCallbackUseCase } from '@/modules/google-calendar/application/use-cases/handle-google-oauth-callback';

describe('HandleGoogleOauthCallbackUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let sut: HandleGoogleOauthCallbackUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    sut = new HandleGoogleOauthCallbackUseCase(connectionsRepository, gateway);
  });

  it('cria uma nova conexão, criptografando o refresh token na borda do repositório (aqui em memória, plaintext)', async () => {
    const { connection } = await sut.execute({
      memberId: 'member-1',
      code: 'auth-code',
    });

    expect(connection.memberId).toBe('member-1');
    expect(connection.refreshToken).toBe(gateway.exchangeResult.refreshToken);
    expect(connectionsRepository.items).toHaveLength(1);
  });

  it('cria o canal de watch logo após conectar', async () => {
    await sut.execute({ memberId: 'member-1', code: 'auth-code' });

    expect(gateway.watchChannelsCreated).toBe(1);
    const [connection] = connectionsRepository.items;
    expect(connection.watchChannelId).toBe(gateway.watchResult.channelId);
    expect(connection.watchExpiresAt).toEqual(gateway.watchResult.expiresAt);
  });

  it('reautoriza (não duplica) quando já existe conexão para o member', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'member-1' }),
    );
    gateway.exchangeResult = {
      refreshToken: 'novo-refresh-token',
      googleAccountEmail: 'novo@example.com',
    };

    const { connection } = await sut.execute({
      memberId: 'member-1',
      code: 'auth-code',
    });

    expect(connectionsRepository.items).toHaveLength(1);
    expect(connection.refreshToken).toBe('novo-refresh-token');
    expect(connection.googleAccountEmail).toBe('novo@example.com');
  });
});
