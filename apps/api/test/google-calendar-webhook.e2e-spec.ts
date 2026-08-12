import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { encryptToken } from '@/core/crypto/token-cipher';
import { env } from '@/core/env/env';
import { mountBetterAuth } from '@/infra/auth/mount-auth';
import { PrismaService } from '@/infra/database/prisma.service';
import { tenantScopedPrismaClient } from '@/infra/database/tenant-scoped-prisma-client';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import { FakeGoogleCalendarQueueProducer } from '@/test/fakes/fake-google-calendar-queue-producer';

/**
 * Requisito 5 (parte síncrona): o webhook rejeita um watchChannelId
 * desconhecido, rejeita um token de canal inválido, e — quando válido —
 * identifica corretamente a organização/conexão e enfileira o
 * processamento (GoogleCalendarQueueProducer substituído por um fake, só
 * essa parte é testada aqui — o processamento em si já é coberto pelos
 * testes unitários de ProcessGoogleCalendarWebhookNotificationUseCase).
 */
describe('Google Calendar — webhook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queueProducer: FakeGoogleCalendarQueueProducer;

  let org: { id: string };
  let connectionId: string;
  const validChannelId = `canal-valido-${randomUUID()}`;
  const validChannelToken = `token-valido-${randomUUID()}`;

  beforeAll(async () => {
    queueProducer = new FakeGoogleCalendarQueueProducer();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleCalendarQueueProducer)
      .useValue(queueProducer)
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    mountBetterAuth(app);
    app.use(json());
    app.use(urlencoded({ extended: true }));
    await app.init();

    prisma = app.get(PrismaService);

    org = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org Google Calendar Webhook (teste)',
        slug: `org-gcal-webhook-${randomUUID().slice(0, 8)}`,
      },
    });

    const user = await prisma.db.user.create({
      data: {
        id: randomUUID(),
        name: 'Profissional Webhook',
        email: `profissional-webhook-${randomUUID().slice(0, 8)}@example.com`,
      },
    });
    const member = await prisma.db.member.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        userId: user.id,
        role: 'staff',
        createdAt: new Date(),
      },
    });

    const connection = await runWithTenantContext(
      { organizationId: org.id },
      async () =>
        tenantScopedPrismaClient.googleCalendarConnection.create({
          data: {
            memberId: member.id,
            googleAccountEmail: 'staff@example.com',
            refreshTokenEncrypted: encryptToken(
              'refresh-token-valido',
              env.GOOGLE_TOKEN_ENCRYPTION_KEY,
            ),
            watchChannelId: validChannelId,
            watchChannelToken: validChannelToken,
            watchResourceId: 'resource-1',
            watchExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }),
    );
    connectionId = connection.id;
  });

  afterAll(async () => {
    await prisma.db.organization.delete({ where: { id: org.id } });
    await app.close();
  });

  it('rejeita um watchChannelId desconhecido', async () => {
    const response = await request(app.getHttpServer())
      .post('/google-calendar/webhook')
      .set('X-Goog-Channel-Id', 'canal-desconhecido')
      .set('X-Goog-Channel-Token', 'qualquer')
      .set('X-Goog-Resource-State', 'exists');

    expect(response.status).toBe(404);
    expect(queueProducer.webhookCalls).toHaveLength(0);
  });

  it('rejeita quando o token do canal está errado', async () => {
    const response = await request(app.getHttpServer())
      .post('/google-calendar/webhook')
      .set('X-Goog-Channel-Id', validChannelId)
      .set('X-Goog-Channel-Token', 'token-errado')
      .set('X-Goog-Resource-State', 'exists');

    expect(response.status).toBe(403);
    expect(queueProducer.webhookCalls).toHaveLength(0);
  });

  it('identifica o tenant/conexão corretos e enfileira o processamento', async () => {
    const response = await request(app.getHttpServer())
      .post('/google-calendar/webhook')
      .set('X-Goog-Channel-Id', validChannelId)
      .set('X-Goog-Channel-Token', validChannelToken)
      .set('X-Goog-Resource-State', 'exists');

    expect(response.status).toBe(200);
    expect(queueProducer.webhookCalls).toEqual([
      { organizationId: org.id, connectionId },
    ]);
  });

  it('não enfileira nada para o handshake inicial ("sync")', async () => {
    const before = queueProducer.webhookCalls.length;

    const response = await request(app.getHttpServer())
      .post('/google-calendar/webhook')
      .set('X-Goog-Channel-Id', validChannelId)
      .set('X-Goog-Channel-Token', validChannelToken)
      .set('X-Goog-Resource-State', 'sync');

    expect(response.status).toBe(200);
    expect(queueProducer.webhookCalls.length).toBe(before);
  });
});
