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
import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';

/**
 * Requisito 8: um horário livre nos dados internos, mas ocupado no Google
 * Calendar do profissional conectado, bloqueia a criação/remarcação do
 * Agendamento — mesmo padrão de erro claro que a regra de choque de
 * horário interna já usa (409).
 */
interface SignUpResponseBody {
  user: { id: string };
}

describe('Google Calendar — Free/Busy bloqueia Agendamento (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gateway: FakeGoogleCalendarGateway;

  let org: { id: string; slug: string };
  let ownerSessionCookie: string;
  let connectedStaffMemberId: string;
  let patientId: string;

  beforeAll(async () => {
    gateway = new FakeGoogleCalendarGateway();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleCalendarGateway)
      .useValue(gateway)
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
        name: 'Org Google Calendar FreeBusy (teste)',
        slug: `org-gcal-fb-${randomUUID().slice(0, 8)}`,
      },
    });

    const email = `staff-${randomUUID().slice(0, 8)}@gcal-fb-test.local`;
    const signUp = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'Sup3rSecret!23', name: 'staff' })
      .expect(200);
    const staffUserId = (signUp.body as SignUpResponseBody).user.id;
    const setCookieHeader = signUp.headers['set-cookie'] as unknown as
      string[] | undefined;
    if (!setCookieHeader?.[0]) {
      throw new Error('Resposta de sign-up não retornou cookie de sessão.');
    }

    connectedStaffMemberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: connectedStaffMemberId,
        organizationId: org.id,
        userId: staffUserId,
        role: 'owner',
        createdAt: new Date(),
      },
    });
    await prisma.db.session.updateMany({
      where: { userId: staffUserId },
      data: { activeOrganizationId: org.id },
    });
    ownerSessionCookie = setCookieHeader[0].split(';')[0];

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
      .send({ nome: 'Paciente FreeBusy' })
      .expect(201);
    patientId = (patientResponse.body as { id: string }).id;
  });

  afterAll(async () => {
    // Ver comentário equivalente em google-calendar-sync.e2e-spec.ts:
    // PatientHealthRecord.organization não tem onDelete: Cascade.
    await prisma.db.patientHealthRecord.deleteMany({
      where: { organizationId: org.id },
    });
    await prisma.db.organization.delete({ where: { id: org.id } });
    await app.close();
  });

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('permite criar quando o Google indica livre', async () => {
    gateway.busy = false;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        dataHoraInicio: '2026-09-01T10:00:00.000Z',
        dataHoraFim: '2026-09-01T11:00:00.000Z',
      });

    expect(response.status).toBe(201);
  });

  it('bloqueia com 409 quando o Google indica ocupado, mesmo sem conflito interno', async () => {
    gateway.busy = true;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        // Horário totalmente livre nos nossos dados internos.
        dataHoraInicio: '2026-09-05T10:00:00.000Z',
        dataHoraFim: '2026-09-05T11:00:00.000Z',
      });

    expect(response.status).toBe(409);
  });

  it('fail-open: falha na chamada ao Google não bloqueia a criação', async () => {
    gateway.shouldFailFreeBusy = true;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({
        patientId,
        profissionalId: connectedStaffMemberId,
        dataHoraInicio: '2026-09-06T10:00:00.000Z',
        dataHoraFim: '2026-09-06T11:00:00.000Z',
      });

    expect(response.status).toBe(201);

    gateway.shouldFailFreeBusy = false;
  });
});
