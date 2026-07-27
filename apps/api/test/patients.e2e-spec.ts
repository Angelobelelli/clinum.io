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
 * Testes do módulo patients (apps/api/src/modules/patients/) — CRUD básico,
 * a regra de negócio central (reception nunca acessa ficha de saúde) e
 * validação de DTO (Zod). Isolamento entre tenants é coberto em
 * tenant-isolation.e2e-spec.ts; RLS pura em patients-rls.e2e-spec.ts.
 */
interface SignUpResponseBody {
  user: { id: string };
}

interface PatientResponseBody {
  id: string;
  nome: string;
}

describe('Patients (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let org: { id: string; slug: string };
  let ownerSessionCookie: string;
  let staffSessionCookie: string;
  let receptionSessionCookie: string;

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
        name: 'Org Patients (teste)',
        slug: `org-patients-${randomUUID().slice(0, 8)}`,
      },
    });

    ownerSessionCookie = await createMember('owner');
    staffSessionCookie = await createMember('staff');
    receptionSessionCookie = await createMember('reception');

    async function createMember(role: string): Promise<string> {
      const email = `${role}-${randomUUID().slice(0, 8)}@patients-test.local`;
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

      return cookie;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  it('owner cria um paciente', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente do Owner', cpf: '12345678901' });

    expect(response.status).toBe(201);
    expect((response.body as PatientResponseBody).nome).toBe(
      'Paciente do Owner',
    );
  });

  it('reception cria um paciente (tem permissão de create/read/update básico)', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie)
      .send({ nome: 'Paciente da Reception' });

    expect(response.status).toBe(201);
  });

  it('reception recebe 403 ao tentar ler a ficha de saúde', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente Ficha Saude 1' })
      .expect(201);
    const patientId = (created.body as PatientResponseBody).id;

    const response = await request(app.getHttpServer())
      .get(`/patients/${patientId}/health-record`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie);

    expect(response.status).toBe(403);
  });

  it('reception recebe 403 ao tentar atualizar a ficha de saúde', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente Ficha Saude 2' })
      .expect(201);
    const patientId = (created.body as PatientResponseBody).id;

    const response = await request(app.getHttpServer())
      .patch(`/patients/${patientId}/health-record`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie)
      .send({ alergias: 'Dipirona' });

    expect(response.status).toBe(403);
  });

  it('staff consegue ler e atualizar a ficha de saúde', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente Ficha Saude 3' })
      .expect(201);
    const patientId = (created.body as PatientResponseBody).id;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/patients/${patientId}/health-record`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffSessionCookie)
      .send({ alergias: 'Dipirona', historico: 'Nenhum relevante' });

    expect(updateResponse.status).toBe(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/patients/${patientId}/health-record`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffSessionCookie);

    expect(getResponse.status).toBe(200);
    expect((getResponse.body as { alergias: string }).alergias).toBe(
      'Dipirona',
    );
  });

  it('owner consegue deletar um paciente, depois 404 ao buscar', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente Para Deletar' })
      .expect(201);
    const patientId = (created.body as PatientResponseBody).id;

    await request(app.getHttpServer())
      .delete(`/patients/${patientId}`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .expect(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie);

    expect(getResponse.status).toBe(404);
  });

  it('rejeita CPF em formato inválido com erro de validação claro', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente CPF Invalido', cpf: '123' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Validation failed' });
  });

  it('rejeita CPF duplicado na mesma organização com 409 (não 500 cru do Prisma)', async () => {
    const cpf = `${Date.now()}`.slice(0, 11);

    await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente CPF Duplicado 1', cpf })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente CPF Duplicado 2', cpf });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      message: 'Já existe um registro com esse valor único.',
    });
  });

  it('401 sem sessão nenhuma', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients')
      .set('Host', hostFor(org.slug));

    expect(response.status).toBe(401);
  });
});
