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
 * Testes de isolamento multi-tenant.
 *
 * Este arquivo é executado pelo job "tenant-isolation" em
 * .github/workflows/ci.yml e é OBRIGATÓRIO no pipeline — não pode ser
 * removido nem substituído por `it.skip` só para o CI "passar". O objetivo
 * dele é garantir que nenhuma query/endpoint retorne ou modifique dado de
 * um tenant (clínica/estética/studio) a partir de outro tenant, já que a
 * aplicação lida com prontuário/ficha de atendimento e dados financeiros.
 *
 * Usa `Patient` (modules/patients/) como o recurso de negócio real pra
 * testar isolamento — ver também prisma-tenant.extension.ts e
 * rls-policies.sql para as duas camadas que esses testes cobrem
 * (indiretamente a camada 1 aqui; a camada 2/RLS pura tem verificação
 * própria em test/patients-rls.e2e-spec.ts).
 */
interface SignUpResponseBody {
  user: { id: string };
}

interface OrganizationResponseBody {
  id: string;
}

interface PatientResponseBody {
  id: string;
  organizationId: string;
  nome: string;
}

interface AgendamentoResponseBody {
  id: string;
  organizationId: string;
}

describe('Isolamento multi-tenant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let orgA: { id: string; slug: string };
  let orgB: { id: string; slug: string };
  let sessionCookie: string;
  let sessionCookieOrgB: string;
  let orgAOwnerMemberId: string;

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
    orgAOwnerMemberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: orgAOwnerMemberId,
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

    // Segundo usuário, owner da org-b — usado nos testes de isolamento com
    // Patient abaixo.
    const emailB = `owner-b-${randomUUID().slice(0, 8)}@tenant-isolation.test`;
    const signUpResponseB = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email: emailB, password: 'Sup3rSecret!23', name: 'Owner B' })
      .expect(200);
    const userIdB = (signUpResponseB.body as SignUpResponseBody).user.id;
    const setCookieHeaderB = signUpResponseB.headers[
      'set-cookie'
    ] as unknown as string[];
    sessionCookieOrgB = setCookieHeaderB[0].split(';')[0];

    await prisma.db.member.create({
      data: {
        id: randomUUID(),
        organizationId: orgB.id,
        userId: userIdB,
        role: 'owner',
        createdAt: new Date(),
      },
    });
    await prisma.db.session.updateMany({
      where: { userId: userIdB },
      data: { activeOrganizationId: orgB.id },
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

  it('não deve retornar registros de outro tenant ao listar um recurso de negócio', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente da Org A' })
      .expect(201);
    const patientA = createResponse.body as PatientResponseBody;

    const listAsOrgB = await request(app.getHttpServer())
      .get('/patients')
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookieOrgB)
      .expect(200);

    const idsVisiveisParaOrgB = (
      listAsOrgB.body as { data: PatientResponseBody[] }
    ).data.map((p) => p.id);
    expect(idsVisiveisParaOrgB).not.toContain(patientA.id);
  });

  it('não deve permitir acessar um recurso de outro tenant pelo ID (404, não 200/403)', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente da Org A 2' })
      .expect(201);
    const patientA = createResponse.body as PatientResponseBody;

    const response = await request(app.getHttpServer())
      .get(`/patients/${patientA.id}`)
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookieOrgB);

    expect(response.status).toBe(404);
  });

  it('não deve permitir criar um recurso apontando organizationId de outro tenant', async () => {
    // organizationId nem existe no schema Zod do endpoint (ver
    // create-patient.schema.ts) — mas o teste manda no corpo cru mesmo
    // assim, simulando um cliente malicioso, pra provar que o servidor
    // (Zod stripando o campo + a extension sobrescrevendo) ignora
    // completamente qualquer organizationId vindo do client.
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente Tentando Spoof', organizationId: orgB.id })
      .expect(201);

    const patient = response.body as PatientResponseBody;
    expect(patient.organizationId).toBe(orgA.id);
    expect(patient.organizationId).not.toBe(orgB.id);
  });

  it('não deve retornar agendamentos de outro tenant ao listar', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente da Org A (agenda)' })
      .expect(201);
    const patientId = (patientResponse.body as PatientResponseBody).id;

    const createResponse = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({
        patientId,
        profissionalId: orgAOwnerMemberId,
        dataHoraInicio: '2026-11-01T10:00:00.000Z',
        dataHoraFim: '2026-11-01T11:00:00.000Z',
      })
      .expect(201);
    const agendamentoA = createResponse.body as AgendamentoResponseBody;

    const listAsOrgB = await request(app.getHttpServer())
      .get('/agendamentos')
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookieOrgB)
      .expect(200);

    const idsVisiveisParaOrgB = (
      listAsOrgB.body as { data: AgendamentoResponseBody[] }
    ).data.map((a) => a.id);
    expect(idsVisiveisParaOrgB).not.toContain(agendamentoA.id);
  });

  it('não deve permitir atualizar/cancelar um agendamento de outro tenant pelo ID (404, não 200/403)', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente da Org A (agenda 2)' })
      .expect(201);
    const patientId = (patientResponse.body as PatientResponseBody).id;

    const createResponse = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({
        patientId,
        profissionalId: orgAOwnerMemberId,
        dataHoraInicio: '2026-11-02T10:00:00.000Z',
        dataHoraFim: '2026-11-02T11:00:00.000Z',
      })
      .expect(201);
    const agendamentoA = createResponse.body as AgendamentoResponseBody;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/agendamentos/${agendamentoA.id}`)
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookieOrgB)
      .send({ observacao: 'tentando mexer em agendamento de outro tenant' });
    expect(updateResponse.status).toBe(404);

    const cancelarResponse = await request(app.getHttpServer())
      .patch(`/agendamentos/${agendamentoA.id}/cancelar`)
      .set('Host', hostFor(orgB.slug))
      .set('Cookie', sessionCookieOrgB);
    expect(cancelarResponse.status).toBe(404);
  });

  it('não deve permitir criar um agendamento apontando organizationId de outro tenant', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({ nome: 'Paciente da Org A (agenda 3)' })
      .expect(201);
    const patientId = (patientResponse.body as PatientResponseBody).id;

    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(orgA.slug))
      .set('Cookie', sessionCookie)
      .send({
        patientId,
        profissionalId: orgAOwnerMemberId,
        dataHoraInicio: '2026-11-03T10:00:00.000Z',
        dataHoraFim: '2026-11-03T11:00:00.000Z',
        organizationId: orgB.id,
      })
      .expect(201);

    const agendamento = response.body as AgendamentoResponseBody;
    expect(agendamento.organizationId).toBe(orgA.id);
    expect(agendamento.organizationId).not.toBe(orgB.id);
  });
});
