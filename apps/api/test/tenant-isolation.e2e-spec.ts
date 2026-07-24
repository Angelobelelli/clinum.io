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
 * Testes de isolamento multi-tenant.
 *
 * Este arquivo é executado pelo job "tenant-isolation" em
 * .github/workflows/ci.yml e é OBRIGATÓRIO no pipeline — não pode ser
 * removido nem substituído por `it.skip` só para o CI "passar". O objetivo
 * dele é garantir que nenhuma query/endpoint retorne ou modifique dado de
 * um tenant (clínica/estética/studio) a partir de outro tenant, já que a
 * aplicação lida com prontuário/ficha de atendimento e dados financeiros.
 *
 * FASE ATUAL: só existe a fundação de tenant/auth (TenantMiddleware +
 * TenantMatchGuard), sem nenhum model de negócio ainda. Os testes abaixo
 * cobrem só o cenário mais básico possível: uma sessão autenticada da org-a,
 * usada contra o domínio da org-b, deve ser barrada com 403 pelo
 * TenantMatchGuard.
 *
 * QUANDO O PRIMEIRO MODEL DE NEGÓCIO EXISTIR (ex: "Patient"), EXPANDA este
 * arquivo para também testar que dados não vazam entre tenants:
 *   - criar um registro sob o contexto da org-a;
 *   - autenticado como org-b, confirmar 404 (não 200/403) ao buscar por ID;
 *   - confirmar que listagens da org-b nunca incluem registros da org-a;
 *   - confirmar que não é possível criar/atualizar um registro apontando
 *     `organizationId` de outro tenant (a prisma-tenant.extension.ts deve
 *     ignorar/sobrescrever qualquer organizationId vindo do client).
 */
interface SignUpResponseBody {
  user: { id: string };
}

interface OrganizationResponseBody {
  id: string;
}

describe('Isolamento multi-tenant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let orgA: { id: string; slug: string };
  let orgB: { id: string; slug: string };
  let sessionCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mesma configuração de main.ts: bodyParser desligado + montagem manual
    // do handler do better-auth antes do parser global (ver mount-auth.ts).
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
        name: 'Org A (teste)',
        slug: `org-a-${randomUUID().slice(0, 8)}`,
      },
    });
    orgB = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org B (teste)',
        slug: `org-b-${randomUUID().slice(0, 8)}`,
      },
    });

    // Sobe um usuário real via better-auth (não via Prisma direto) para
    // exercitar o fluxo de autenticação de ponta a ponta.
    const email = `owner-${randomUUID().slice(0, 8)}@tenant-isolation.test`;
    const signUpResponse = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'Sup3rSecret!23', name: 'Owner' })
      .expect(200);

    const userId = (signUpResponse.body as SignUpResponseBody).user.id;
    const setCookieHeader = signUpResponse.headers[
      'set-cookie'
    ] as unknown as string[];
    sessionCookie = setCookieHeader[0].split(';')[0];

    // Vincula o usuário à org-a como membro e ativa a org-a na sessão.
    // Feito via Prisma direto (não pelo endpoint de organização do
    // better-auth) porque, nesta fase, ainda não montamos esse fluxo — o
    // que importa aqui é testar TenantMiddleware + TenantMatchGuard, não o
    // plugin Organization em si.
    await prisma.db.member.create({
      data: {
        id: randomUUID(),
        organizationId: orgA.id,
        userId,
        role: 'owner',
        createdAt: new Date(),
      },
    });
    await prisma.db.session.updateMany({
      where: { userId },
      data: { activeOrganizationId: orgA.id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  /** Host "de produção" simulado — 3+ labels para bater com extractSubdomain(). */
  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('permite acesso quando a organização da sessão bate com o domínio', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect((response.body as OrganizationResponseBody).id).toBe(orgA.id);
  });

  it('barra com 403 uma sessão da org-a usada contra o domínio da org-b', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(403);
  });

  it('retorna 404 quando o domínio não corresponde a nenhuma organização', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/me')
      .set('Host', hostFor('org-inexistente'));

    expect(response.status).toBe(404);
  });

  it.todo(
    'não deve retornar registros de outro tenant ao listar um recurso de negócio (ver comentário no topo do arquivo)',
  );
  it.todo(
    'não deve permitir acessar um recurso de outro tenant pelo ID (404, não 200/403)',
  );
  it.todo(
    'não deve permitir criar/atualizar um recurso apontando organizationId de outro tenant',
  );
});
