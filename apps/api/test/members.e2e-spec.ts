import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { mountBetterAuth } from '@/infra/auth/mount-auth';
import { PrismaService } from '@/infra/database/prisma.service';

/**
 * Testes da migration add_member_tipo_vinculo_status_unique_constraint e
 * do módulo members (apps/api/src/modules/members/) — atualização de
 * tipoVinculo/status, separada do fluxo de member do better-auth, e
 * validação de vertical/plano/role via organizationHooks (auth.ts).
 */
interface SignUpResponseBody {
  user: { id: string };
}

describe('Members — tipoVinculo/status e validação (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let org: { id: string; slug: string };
  let ownerUserId: string;
  let ownerMemberId: string;
  let ownerSessionCookie: string;

  let staffUserId: string;
  let staffMemberId: string;
  let staffSessionCookie: string;

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

    org = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org Members (teste)',
        slug: `org-members-${randomUUID().slice(0, 8)}`,
      },
    });

    ownerUserId = await signUpAndGetUserId('owner');
    ownerSessionCookie = await signInAndGetCookie(ownerUserId);
    ownerMemberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: ownerMemberId,
        organizationId: org.id,
        userId: ownerUserId,
        role: 'owner',
        createdAt: new Date(),
      },
    });
    await prisma.db.session.updateMany({
      where: { userId: ownerUserId },
      data: { activeOrganizationId: org.id },
    });

    staffUserId = await signUpAndGetUserId('staff');
    staffSessionCookie = await signInAndGetCookie(staffUserId);
    staffMemberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: staffMemberId,
        organizationId: org.id,
        userId: staffUserId,
        role: 'staff',
        createdAt: new Date(),
      },
    });
    await prisma.db.session.updateMany({
      where: { userId: staffUserId },
      data: { activeOrganizationId: org.id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function signUpAndGetUserId(label: string): Promise<string> {
    const email = `${label}-${randomUUID().slice(0, 8)}@members-test.local`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'Sup3rSecret!23', name: label })
      .expect(200);
    return (response.body as SignUpResponseBody).user.id;
  }

  async function signInAndGetCookie(userId: string): Promise<string> {
    const user = await prisma.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: 'Sup3rSecret!23' })
      .expect(200);
    const setCookieHeader = response.headers['set-cookie'] as unknown as
      string[] | undefined;
    if (!setCookieHeader?.[0]) {
      throw new Error('Resposta de sign-in não retornou cookie de sessão.');
    }
    return setCookieHeader[0].split(';')[0];
  }

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('migration não quebrou member já existente (status default = ativo, tipoVinculo null)', async () => {
    const member = await prisma.db.member.findUniqueOrThrow({
      where: { id: ownerMemberId },
    });

    expect(member.status).toBe('ativo');
    expect(member.tipoVinculo).toBeNull();
    expect(member.role).toBe('owner');
  });

  it('owner/admin consegue atualizar tipoVinculo/status de outro member', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/members/${staffMemberId}/vinculo`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ tipoVinculo: 'funcionario', status: 'inativo' });

    expect(response.status).toBe(200);

    const updated = await prisma.db.member.findUniqueOrThrow({
      where: { id: staffMemberId },
    });
    expect(updated.tipoVinculo).toBe('funcionario');
    expect(updated.status).toBe('inativo');
  });

  it('staff tentando atualizar o próprio vínculo recebe 403', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/members/${staffMemberId}/vinculo`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffSessionCookie)
      .send({ tipoVinculo: 'parceiro_comissionado' });

    expect(response.status).toBe(403);
  });

  it('qualquer papel autenticado consegue listar os members da própria organização', async () => {
    const response = await request(app.getHttpServer())
      .get('/members')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffSessionCookie)
      .expect(200);

    const body = response.body as {
      data: { id: string; role: string }[];
      meta: { total: number };
    };
    const idsRetornados = body.data.map((m) => m.id);
    expect(idsRetornados).toContain(ownerMemberId);
    expect(idsRetornados).toContain(staffMemberId);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('401 ao listar members sem sessão nenhuma', async () => {
    const response = await request(app.getHttpServer())
      .get('/members')
      .set('Host', hostFor(org.slug));

    expect(response.status).toBe(401);
  });

  it('rejeita vertical fora da lista permitida ao criar organização', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/organization/create')
      // Endpoints de escrita do plugin organization também exigem Origin
      // válido (mesmo comportamento do plugin admin, ver
      // platform-admin.e2e-spec.ts).
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Org Vertical Inválida',
        slug: `org-vertical-invalida-${randomUUID().slice(0, 8)}`,
        vertical: 'vertical_que_nao_existe',
      });

    expect(response.status).toBe(400);
  });

  it('rejeita role fora da lista permitida ao atualizar papel de member', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/organization/update-member-role')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', ownerSessionCookie)
      .send({
        memberId: staffMemberId,
        role: 'superadmin',
        organizationId: org.id,
      });

    expect(response.status).toBe(400);
  });

  it('bônus: 404 (não 403) ao tentar alterar vínculo de member de outro tenant', async () => {
    const otherOrg = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Outra Org (teste)',
        slug: `outra-org-${randomUUID().slice(0, 8)}`,
      },
    });
    const otherMemberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: otherMemberId,
        organizationId: otherOrg.id,
        userId: staffUserId,
        role: 'staff',
        createdAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/members/${otherMemberId}/vinculo`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ status: 'inativo' });

    expect(response.status).toBe(404);
  });
});
