import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { mountBetterAuth } from '../src/core/auth/mount-auth';
import { PrismaService } from '../src/core/database/prisma.service';

/**
 * Testes da administração de PLATAFORMA (dono do SaaS, cross-tenant) — ver
 * apps/api/src/modules/platform-admin/.
 *
 * Diferente de tenant-isolation.e2e-spec.ts (que garante que NENHUMA rota
 * cruza dados entre tenants), este arquivo garante o oposto e deliberado:
 * que um super_admin de plataforma CONSEGUE cruzar dados entre tenants
 * através de /platform-admin/*, e que isso fica auditado, enquanto
 * qualquer outro usuário continua barrado.
 */
interface SignUpResponseBody {
  user: { id: string };
}

interface OrganizationResponseBody {
  id: string;
}

describe('Administração de plataforma (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let orgA: { id: string; slug: string };
  let orgB: { id: string; slug: string };

  let regularUserId: string;
  let regularSessionCookie: string;

  let superAdminUserId: string;
  let superAdminSessionCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    mountBetterAuth(app);
    app.use(json());
    app.use(urlencoded({ extended: true }));
    await app.init();

    prisma = app.get(PrismaService);

    orgA = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org A (platform-admin teste)',
        slug: `platform-org-a-${randomUUID().slice(0, 8)}`,
      },
    });
    orgB = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org B (platform-admin teste)',
        slug: `platform-org-b-${randomUUID().slice(0, 8)}`,
      },
    });

    // Usuário comum — platformRole nunca é setado explicitamente aqui, só
    // para provar que o default (ausência de "super_admin") já barra.
    const regularEmail = `regular-${randomUUID().slice(0, 8)}@platform-admin.test`;
    const regularSignUp = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: regularEmail,
        password: 'Sup3rSecret!23',
        name: 'Regular',
      })
      .expect(200);
    regularUserId = (regularSignUp.body as SignUpResponseBody).user.id;
    regularSessionCookie = extractSessionCookie(regularSignUp);

    // super_admin — o bootstrap real (fora de teste) é feito via o script
    // `pnpm run admin:promote -- <email>` (ver README/CONTRIBUTING). Aqui
    // fazemos o equivalente direto no banco, já que é exatamente isso que
    // o script faz por baixo dos panos.
    const superAdminEmail = `super-admin-${randomUUID().slice(0, 8)}@platform-admin.test`;
    const superAdminSignUp = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: superAdminEmail,
        password: 'Sup3rSecret!23',
        name: 'Super Admin',
      })
      .expect(200);
    superAdminUserId = (superAdminSignUp.body as SignUpResponseBody).user.id;
    superAdminSessionCookie = extractSessionCookie(superAdminSignUp);

    await prisma.db.user.update({
      where: { id: superAdminUserId },
      data: { platformRole: 'super_admin' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function extractSessionCookie(response: request.Response): string {
    const setCookieHeader = response.headers['set-cookie'] as unknown as
      string[] | undefined;
    if (!setCookieHeader?.[0]) {
      throw new Error('Resposta de sign-up não retornou cookie de sessão.');
    }
    return setCookieHeader[0].split(';')[0];
  }

  it('barra um usuário comum (sem platformRole=super_admin) com 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/platform-admin/organizations')
      .set('Cookie', regularSessionCookie);

    expect(response.status).toBe(403);
  });

  it('barra requisição sem sessão com 401', async () => {
    const response = await request(app.getHttpServer()).get(
      '/platform-admin/organizations',
    );

    expect(response.status).toBe(401);
  });

  it('permite super_admin acessar organizations de mais de um tenant ao mesmo tempo', async () => {
    const response = await request(app.getHttpServer())
      .get('/platform-admin/organizations')
      .set('Cookie', superAdminSessionCookie);

    expect(response.status).toBe(200);
    const ids = (
      response.body as { data: OrganizationResponseBody[] }
    ).data.map((org) => org.id);
    expect(ids).toEqual(expect.arrayContaining([orgA.id, orgB.id]));
  });

  it('grava um AdminAuditLog ao chamar uma rota de platform-admin', async () => {
    await request(app.getHttpServer())
      .get('/platform-admin/organizations')
      .set('Cookie', superAdminSessionCookie)
      .expect(200);

    const logs = await prisma.db.adminAuditLog.findMany({
      where: {
        adminUserId: superAdminUserId,
        action: 'list_organizations',
      },
    });

    expect(logs.length).toBeGreaterThan(0);
  });

  it('grava um AdminAuditLog de ação "impersonate" ao impersonificar um usuário', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/admin/impersonate-user')
      // O better-auth exige um header Origin válido (contra
      // BETTER_AUTH_TRUSTED_ORIGINS) em endpoints sensíveis do plugin
      // `admin` — sign-up/sign-in não exigem isso, mas impersonate exige.
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', superAdminSessionCookie)
      .send({ userId: regularUserId })
      .expect(200);

    const logs = await prisma.db.adminAuditLog.findMany({
      where: {
        adminUserId: superAdminUserId,
        action: 'impersonate',
        targetUserId: regularUserId,
      },
    });

    expect(logs.length).toBeGreaterThan(0);
  });
});
