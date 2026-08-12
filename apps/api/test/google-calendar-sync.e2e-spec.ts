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
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { FakeGoogleCalendarQueueProducer } from '@/test/fakes/fake-google-calendar-queue-producer';

/**
 * Sync App→Google ao criar/editar/cancelar Agendamento: verifica que a
 * chamada correspondente é enfileirada corretamente (GoogleCalendarGateway
 * E GoogleCalendarQueueProducer substituídos por fakes — nunca chama a API
 * real do Google nem depende do worker de fato processar o job).
 */
interface SignUpResponseBody {
  user: { id: string };
}
interface AgendamentoResponseBody {
  id: string;
}

describe('Google Calendar — sync App→Google (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gateway: FakeGoogleCalendarGateway;
  let queueProducer: FakeGoogleCalendarQueueProducer;

  let org: { id: string; slug: string };
  let ownerSessionCookie: string;
  let connectedStaffMemberId: string;
  let disconnectedStaffMemberId: string;
  let patientId: string;

  beforeAll(async () => {
    gateway = new FakeGoogleCalendarGateway();
    queueProducer = new FakeGoogleCalendarQueueProducer();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleCalendarGateway)
      .useValue(gateway)
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
        name: 'Org Google Calendar Sync (teste)',
        slug: `org-gcal-sync-${randomUUID().slice(0, 8)}`,
      },
    });

    ownerSessionCookie = (await createMember('owner')).cookie;
    connectedStaffMemberId = (await createMember('staff')).memberId;
    disconnectedStaffMemberId = (await createMember('staff')).memberId;

    await runWithTenantContext({ organizationId: org.id }, async () =>
      tenantScopedPrismaClient.googleCalendarConnection.create({
        data: {
          memberId: connectedStaffMemberId,
          googleAccountEmail: 'staff@example.com',
          refreshTokenEncrypted: encryptToken(
            'refresh-token-valido',
            env.GOOGLE_TOKEN_ENCRYPTION_KEY,
          ),
        },
      }),
    );

    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente Sync' })
      .expect(201);
    patientId = (patientResponse.body as { id: string }).id;

    async function createMember(
      role: string,
    ): Promise<{ cookie: string; memberId: string }> {
      const email = `${role}-${randomUUID().slice(0, 8)}@gcal-sync-test.local`;
      const signUp = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({ email, password: 'Sup3rSecret!23', name: role })
        .expect(200);
      const userId = (signUp.body as SignUpResponseBody).user.id;
      const setCookieHeader = signUp.headers['set-cookie'] as unknown as
        string[] | undefined;
      if (!setCookieHeader?.[0]) {
        throw new Error('Resposta de sign-up não retornou cookie de sessão.');
      }
      const cookie = setCookieHeader[0].split(';')[0];

      const memberId = randomUUID();
      await prisma.db.member.create({
        data: {
          id: memberId,
          organizationId: org.id,
          userId,
          role,
          createdAt: new Date(),
        },
      });
      await prisma.db.session.updateMany({
        where: { userId },
        data: { activeOrganizationId: org.id },
      });

      return { cookie, memberId };
    }
  });

  afterAll(async () => {
    // PatientHealthRecord.organization não tem onDelete: Cascade (só
    // PatientHealthRecord.patient tem) — precisa ser removido explicitamente
    // antes, senão o delete da organização falha por FK. CreatePatientUseCase
    // sempre cria um (ver modules/patients/), então POST /patients (usado
    // acima) sempre deixa uma linha aqui.
    await prisma.db.patientHealthRecord.deleteMany({
      where: { organizationId: org.id },
    });
    await prisma.db.organization.delete({ where: { id: org.id } });
    await app.close();
  });

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('enfileira o sync ao criar um Agendamento para profissional conectado', async () => {
    const before = queueProducer.syncCalls.length;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        dataHoraInicio: '2026-09-01T10:00:00.000Z',
        dataHoraFim: '2026-09-01T11:00:00.000Z',
      })
      .expect(201);

    expect(queueProducer.syncCalls.length).toBe(before + 1);
    const call = queueProducer.syncCalls[queueProducer.syncCalls.length - 1];
    expect(call).toMatchObject({
      agendamentoId: (response.body as AgendamentoResponseBody).id,
      profissionalId: connectedStaffMemberId,
      type: 'upsert',
    });
  });

  it('não enfileira nada ao criar um Agendamento para profissional SEM conexão', async () => {
    const before = queueProducer.syncCalls.length;

    await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: disconnectedStaffMemberId,
        dataHoraInicio: '2026-09-02T10:00:00.000Z',
        dataHoraFim: '2026-09-02T11:00:00.000Z',
      })
      .expect(201);

    expect(queueProducer.syncCalls.length).toBe(before);
  });

  it('enfileira o sync ao atualizar e ao cancelar um Agendamento de profissional conectado', async () => {
    const created = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        dataHoraInicio: '2026-09-03T10:00:00.000Z',
        dataHoraFim: '2026-09-03T11:00:00.000Z',
      })
      .expect(201);
    const agendamentoId = (created.body as AgendamentoResponseBody).id;

    const afterCreate = queueProducer.syncCalls.length;

    await request(app.getHttpServer())
      .patch(`/agendamentos/${agendamentoId}`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ observacao: 'confirmado' })
      .expect(200);

    expect(queueProducer.syncCalls.length).toBe(afterCreate + 1);
    expect(queueProducer.syncCalls[afterCreate]).toMatchObject({
      agendamentoId,
      type: 'upsert',
    });

    await request(app.getHttpServer())
      .patch(`/agendamentos/${agendamentoId}/cancelar`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .expect(200);

    expect(queueProducer.syncCalls.length).toBe(afterCreate + 2);
    expect(queueProducer.syncCalls[afterCreate + 1]).toMatchObject({
      agendamentoId,
      type: 'cancel',
    });
  });

  it('bloqueia a criação quando o Google Calendar indica ocupado (Free/Busy)', async () => {
    gateway.busy = true;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        dataHoraInicio: '2026-09-04T10:00:00.000Z',
        dataHoraFim: '2026-09-04T11:00:00.000Z',
      });

    expect(response.status).toBe(409);

    gateway.busy = false;
  });
});
