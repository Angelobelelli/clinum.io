import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { mountBetterAuth } from '@/infra/auth/mount-auth';
import { PrismaService } from '@/infra/database/prisma.service';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';

/**
 * Fluxo OAuth do Google Calendar — só o próprio member conecta/desconecta a
 * própria conta; owner/admin só leem quais profissionais têm conexão
 * ativa. GoogleCalendarGateway é substituído por um fake: nunca chama a
 * API real do Google.
 */
interface SignUpResponseBody {
  user: { id: string };
}

describe('Google Calendar OAuth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gateway: FakeGoogleCalendarGateway;

  let org: { id: string; slug: string };
  let ownerSessionCookie: string;
  let staffASessionCookie: string;
  let staffBSessionCookie: string;
  let receptionSessionCookie: string;

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
        name: 'Org Google Calendar OAuth (teste)',
        slug: `org-gcal-oauth-${randomUUID().slice(0, 8)}`,
      },
    });

    ownerSessionCookie = (await createMember('owner')).cookie;
    staffASessionCookie = (await createMember('staff')).cookie;
    staffBSessionCookie = (await createMember('staff')).cookie;
    receptionSessionCookie = (await createMember('reception')).cookie;

    async function createMember(role: string): Promise<{ cookie: string }> {
      const email = `${role}-${randomUUID().slice(0, 8)}@gcal-oauth-test.local`;
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

      await prisma.db.member.create({
        data: {
          id: randomUUID(),
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

      return { cookie };
    }
  });

  afterAll(async () => {
    await prisma.db.organization.delete({ where: { id: org.id } });
    await app.close();
  });

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('staff conecta a própria conta do Google Calendar', async () => {
    // O Google real devolveria code+state (o mesmo state que recebeu) no
    // redirect de volta ao callback — o fake replica isso ecoando o state
    // recebido na própria authUrl, para o teste poder capturá-lo.
    gateway.buildAuthUrl = (state: string) =>
      `${gateway.authUrl}?state=${encodeURIComponent(state)}`;

    const startResponse = await request(app.getHttpServer())
      .get('/google-calendar/oauth/start')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffASessionCookie);

    expect(startResponse.status).toBe(302);
    const location = startResponse.headers.location;
    expect(location).toContain(gateway.authUrl);

    const state = new URL(location).searchParams.get('state') ?? '';

    const callbackResponse = await request(app.getHttpServer())
      .get('/google-calendar/oauth/callback')
      .query({ code: 'fake-authorization-code', state })
      .expect(200);

    expect(callbackResponse.body).toMatchObject({
      googleAccountEmail: gateway.exchangeResult.googleAccountEmail,
    });
    expect(callbackResponse.body).not.toHaveProperty('refreshToken');
    expect(callbackResponse.body).not.toHaveProperty('refreshTokenEncrypted');
  });

  it('rejeita um state adulterado no callback', async () => {
    const response = await request(app.getHttpServer())
      .get('/google-calendar/oauth/callback')
      .query({ code: 'qualquer', state: 'estado-invalido.assinatura-falsa' });

    expect(response.status).toBe(400);
  });

  it('staff B não tem conexão — desconectar afeta só a própria conta (sem :memberId na rota)', async () => {
    const response = await request(app.getHttpServer())
      .delete('/google-calendar/connection')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffBSessionCookie);

    expect(response.status).toBe(404);
  });

  it('owner e admin veem as conexões da organização; staff e reception recebem 403', async () => {
    const asOwner = await request(app.getHttpServer())
      .get('/google-calendar/connections')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie);
    expect(asOwner.status).toBe(200);
    expect(Array.isArray(asOwner.body)).toBe(true);

    const asStaff = await request(app.getHttpServer())
      .get('/google-calendar/connections')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffASessionCookie);
    expect(asStaff.status).toBe(403);

    const asReception = await request(app.getHttpServer())
      .get('/google-calendar/connections')
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie);
    expect(asReception.status).toBe(403);
  });

  it('reception recebe 403 ao tentar conectar/desconectar', async () => {
    const start = await request(app.getHttpServer())
      .get('/google-calendar/oauth/start')
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie);
    expect(start.status).toBe(403);

    const disconnect = await request(app.getHttpServer())
      .delete('/google-calendar/connection')
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie);
    expect(disconnect.status).toBe(403);
  });
});
