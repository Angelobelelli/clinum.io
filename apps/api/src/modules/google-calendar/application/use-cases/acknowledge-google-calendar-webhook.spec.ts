import { FakeGoogleCalendarQueueProducer } from '@/test/fakes/fake-google-calendar-queue-producer';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { AcknowledgeGoogleCalendarWebhookUseCase } from '@/modules/google-calendar/application/use-cases/acknowledge-google-calendar-webhook';
import { InvalidWatchChannelTokenError } from '@/modules/google-calendar/application/use-cases/errors/invalid-watch-channel-token-error';
import { UnknownWatchChannelError } from '@/modules/google-calendar/application/use-cases/errors/unknown-watch-channel-error';

describe('AcknowledgeGoogleCalendarWebhookUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let queueProducer: FakeGoogleCalendarQueueProducer;
  let sut: AcknowledgeGoogleCalendarWebhookUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    queueProducer = new FakeGoogleCalendarQueueProducer();
    sut = new AcknowledgeGoogleCalendarWebhookUseCase(
      connectionsRepository,
      queueProducer,
    );
  });

  it('rejeita um watchChannelId desconhecido', async () => {
    const result = await sut.execute({
      watchChannelId: 'canal-desconhecido',
      watchChannelToken: 'qualquer',
      resourceState: 'exists',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(UnknownWatchChannelError);
    }
    expect(queueProducer.webhookCalls).toHaveLength(0);
  });

  it('rejeita quando o token do canal não bate', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({
        organizationId: 'org-1',
        watchChannelId: 'canal-1',
        watchChannelToken: 'token-certo',
      }),
    );

    const result = await sut.execute({
      watchChannelId: 'canal-1',
      watchChannelToken: 'token-errado',
      resourceState: 'exists',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidWatchChannelTokenError);
    }
    expect(queueProducer.webhookCalls).toHaveLength(0);
  });

  it('identifica corretamente o tenant/profissional e enfileira o processamento', async () => {
    const connection = await connectionsRepository.create(
      makeGoogleCalendarConnection({
        organizationId: 'org-1',
        watchChannelId: 'canal-1',
        watchChannelToken: 'token-certo',
      }),
    );

    const result = await sut.execute({
      watchChannelId: 'canal-1',
      watchChannelToken: 'token-certo',
      resourceState: 'exists',
    });

    expect(result.isRight()).toBe(true);
    expect(queueProducer.webhookCalls).toEqual([
      { organizationId: 'org-1', connectionId: connection.id.toValue() },
    ]);
  });

  it('não enfileira nada para o handshake inicial ("sync")', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({
        watchChannelId: 'canal-1',
        watchChannelToken: 'token-certo',
      }),
    );

    const result = await sut.execute({
      watchChannelId: 'canal-1',
      watchChannelToken: 'token-certo',
      resourceState: 'sync',
    });

    expect(result.isRight()).toBe(true);
    expect(queueProducer.webhookCalls).toHaveLength(0);
  });
});
