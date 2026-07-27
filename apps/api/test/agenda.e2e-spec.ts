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
 * Testes do módulo agenda (apps/api/src/modules/agenda/) — CRUD básico,
 * controle de acesso por papel (owner/admin acesso total, reception acesso
 * total dentro do tenant, staff restrito aos próprios agendamentos) e a
 * regra de negócio central de choque de horário. Isolamento entre tenants
 * é coberto em tenant-isolation.e2e-spec.ts; RLS pura em
 * agendamentos-rls.e2e-spec.ts.
 */
interface SignUpResponseBody {
  user: { id: string };
}

interface AgendamentoResponseBody {
  id: string;
  profissionalId: string;
  status: string;
}

describe('Agenda (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let org: { id: string; slug: string };
  let patientId: string;
  let ownerSessionCookie: string;
  let adminSessionCookie: string;
  let receptionSessionCookie: string;
  let staffASessionCookie: string;
  let staffAMemberId: string;
  let staffBMemberId: string;

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
        name: 'Org Agenda (teste)',
        slug: `org-agenda-${randomUUID().slice(0, 8)}`,
      },
    });

    ownerSessionCookie = (await createMember('owner')).cookie;
    adminSessionCookie = (await createMember('admin')).cookie;
    receptionSessionCookie = (await createMember('reception')).cookie;
    const staffA = await createMember('staff');
    staffASessionCookie = staffA.cookie;
    staffAMemberId = staffA.memberId;
    const staffB = await createMember('staff');
    staffBMemberId = staffB.memberId;

    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send({ nome: 'Paciente da Agenda' })
      .expect(201);
    patientId = (patientResponse.body as { id: string }).id;

    async function createMember(
      role: string,
    ): Promise<{ cookie: string; memberId: string }> {
      const email = `${role}-${randomUUID().slice(0, 8)}@agenda-test.local`;
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
    await app.close();
  });

  function hostFor(slug: string): string {
    return `${slug}.clinum-tests.internal`;
  }

  function agendamentoInput(overrides: Record<string, unknown> = {}) {
    return {
      patientId,
      profissionalId: staffAMemberId,
      dataHoraInicio: '2026-09-01T10:00:00.000Z',
      dataHoraFim: '2026-09-01T11:00:00.000Z',
      ...overrides,
    };
  }

  it('owner cria um agendamento para qualquer profissional', async () => {
    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send(
        agendamentoInput({
          dataHoraInicio: '2026-09-02T10:00:00.000Z',
          dataHoraFim: '2026-09-02T11:00:00.000Z',
        }),
      );

    expect(response.status).toBe(201);
    expect((response.body as AgendamentoResponseBody).status).toBe('agendado');
  });

  it('reception cria um agendamento para qualquer profissional', async () => {
    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', receptionSessionCookie)
      .send(
        agendamentoInput({
          profissionalId: staffBMemberId,
          dataHoraInicio: '2026-09-03T10:00:00.000Z',
          dataHoraFim: '2026-09-03T11:00:00.000Z',
        }),
      );

    expect(response.status).toBe(201);
  });

  it('staff cria um agendamento para si mesmo', async () => {
    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffASessionCookie)
      .send(
        agendamentoInput({
          dataHoraInicio: '2026-09-04T10:00:00.000Z',
          dataHoraFim: '2026-09-04T11:00:00.000Z',
        }),
      );

    expect(response.status).toBe(201);
  });

  it('staff recebe 403 ao tentar criar agendamento para outro profissional', async () => {
    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', staffASessionCookie)
      .send(
        agendamentoInput({
          profissionalId: staffBMemberId,
          dataHoraInicio: '2026-09-05T10:00:00.000Z',
          dataHoraFim: '2026-09-05T11:00:00.000Z',
        }),
      );

    expect(response.status).toBe(403);
  });

  it('rejeita dataHoraFim antes ou igual a dataHoraInicio', async () => {
    const response = await request(app.getHttpServer())
      .post('/agendamentos')
      .set('Host', hostFor(org.slug))
      .set('Cookie', ownerSessionCookie)
      .send(
        agendamentoInput({
          dataHoraInicio: '2026-09-06T11:00:00.000Z',
          dataHoraFim: '2026-09-06T10:00:00.000Z',
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Validation failed' });
  });

  describe('choque de horário', () => {
    it('bloqueia dois agendamentos sobrepostos para o mesmo profissional', async () => {
      await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-10T14:00:00.000Z',
            dataHoraFim: '2026-09-10T15:00:00.000Z',
          }),
        )
        .expect(201);

      const conflitante = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-10T14:30:00.000Z',
            dataHoraFim: '2026-09-10T15:30:00.000Z',
          }),
        );

      expect(conflitante.status).toBe(409);
    });

    it('permite o mesmo horário para profissionais diferentes', async () => {
      await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            profissionalId: staffAMemberId,
            dataHoraInicio: '2026-09-11T14:00:00.000Z',
            dataHoraFim: '2026-09-11T15:00:00.000Z',
          }),
        )
        .expect(201);

      const outroProfissional = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            profissionalId: staffBMemberId,
            dataHoraInicio: '2026-09-11T14:00:00.000Z',
            dataHoraFim: '2026-09-11T15:00:00.000Z',
          }),
        );

      expect(outroProfissional.status).toBe(201);
    });

    it('um agendamento cancelado não bloqueia o horário', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-12T14:00:00.000Z',
            dataHoraFim: '2026-09-12T15:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      const novoNoMesmoHorario = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-12T14:00:00.000Z',
            dataHoraFim: '2026-09-12T15:00:00.000Z',
          }),
        );

      expect(novoNoMesmoHorario.status).toBe(201);
    });
  });

  describe('controle de acesso por papel', () => {
    it('staff só vê os próprios agendamentos ao listar', async () => {
      const response = await request(app.getHttpServer())
        .get('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', staffASessionCookie)
        .expect(200);

      const profissionaisRetornados = (
        response.body as AgendamentoResponseBody[]
      ).map((a) => a.profissionalId);
      expect(profissionaisRetornados.every((id) => id === staffAMemberId)).toBe(
        true,
      );
    });

    it('reception vê agendamentos de todos os profissionais', async () => {
      const response = await request(app.getHttpServer())
        .get('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', receptionSessionCookie)
        .expect(200);

      const profissionaisRetornados = new Set(
        (response.body as AgendamentoResponseBody[]).map(
          (a) => a.profissionalId,
        ),
      );
      expect(profissionaisRetornados.has(staffAMemberId)).toBe(true);
      expect(profissionaisRetornados.has(staffBMemberId)).toBe(true);
    });

    it('staff recebe 403 ao tentar atualizar agendamento de outro profissional', async () => {
      const deOutroProfissional = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            profissionalId: staffBMemberId,
            dataHoraInicio: '2026-09-13T10:00:00.000Z',
            dataHoraFim: '2026-09-13T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (
        deOutroProfissional.body as AgendamentoResponseBody
      ).id;

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', staffASessionCookie)
        .send({ observacao: 'tentando mexer no agendamento alheio' });

      expect(response.status).toBe(403);
    });

    it('reception consegue atualizar e cancelar agendamento de qualquer profissional', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            profissionalId: staffBMemberId,
            dataHoraInicio: '2026-09-14T10:00:00.000Z',
            dataHoraFim: '2026-09-14T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', receptionSessionCookie)
        .send({ observacao: 'confirmado por telefone' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', receptionSessionCookie)
        .expect(200);
    });

    it('reception recebe 403 ao tentar marcar status (realizado/falta)', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-15T10:00:00.000Z',
            dataHoraFim: '2026-09-15T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/status`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', receptionSessionCookie)
        .send({ status: 'realizado' });

      expect(response.status).toBe(403);
    });

    it('staff consegue marcar o próprio agendamento como realizado', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', staffASessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-16T10:00:00.000Z',
            dataHoraFim: '2026-09-16T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/status`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', staffASessionCookie)
        .send({ status: 'realizado' });

      expect(response.status).toBe(200);
      expect((response.body as AgendamentoResponseBody).status).toBe(
        'realizado',
      );
    });

    it('owner tem acesso total: cria, atualiza, marca status e cancela de qualquer profissional', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            profissionalId: staffBMemberId,
            dataHoraInicio: '2026-09-17T10:00:00.000Z',
            dataHoraFim: '2026-09-17T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send({ observacao: 'ajustado pelo owner' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/status`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send({ status: 'falta' })
        .expect(200);
    });
  });

  describe('estado terminal e reversão', () => {
    it('PATCH update/cancelar/status retornam 409 quando o agendamento já está em estado terminal', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-20T10:00:00.000Z',
            dataHoraFim: '2026-09-20T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send({ observacao: 'tentando mexer num agendamento cancelado' });
      expect(updateResponse.status).toBe(409);

      const cancelarResponse = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie);
      expect(cancelarResponse.status).toBe(409);

      const statusResponse = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/status`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send({ status: 'realizado' });
      expect(statusResponse.status).toBe(409);
    });

    it('staff e reception recebem 403 ao tentar reverter', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-21T10:00:00.000Z',
            dataHoraFim: '2026-09-21T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      const comoStaff = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', staffASessionCookie)
        .send({
          novoStatus: 'agendado',
          motivo: 'Tentando reverter como staff',
        });
      expect(comoStaff.status).toBe(403);

      const comoReception = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', receptionSessionCookie)
        .send({
          novoStatus: 'agendado',
          motivo: 'Tentando reverter como reception',
        });
      expect(comoReception.status).toBe(403);
    });

    it('reverter sem motivo (ou motivo muito curto) retorna erro de validação', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-22T10:00:00.000Z',
            dataHoraFim: '2026-09-22T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      const semMotivo = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({ novoStatus: 'agendado' });
      expect(semMotivo.status).toBe(400);

      const motivoCurto = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({ novoStatus: 'agendado', motivo: 'curto' });
      expect(motivoCurto.status).toBe(400);
    });

    it('admin reverte um agendamento cancelado com motivo válido, e isso gera um registro em AgendamentoAuditLog', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-23T10:00:00.000Z',
            dataHoraFim: '2026-09-23T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({
          novoStatus: 'confirmado',
          motivo: 'Cliente ligou pedindo pra remarcar no mesmo horário',
        });

      expect(response.status).toBe(200);
      expect((response.body as AgendamentoResponseBody).status).toBe(
        'confirmado',
      );

      const auditLogs = await prisma.db.agendamentoAuditLog.findMany({
        where: { agendamentoId },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        statusAnterior: 'cancelado',
        statusNovo: 'confirmado',
        motivo: 'Cliente ligou pedindo pra remarcar no mesmo horário',
      });
    });

    it('reverter um agendamento que não está em estado terminal retorna erro', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-24T10:00:00.000Z',
            dataHoraFim: '2026-09-24T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({
          novoStatus: 'agendado',
          motivo: 'Não deveria funcionar, ainda está agendado',
        });

      expect(response.status).toBe(409);
    });

    it('reverter um agendamento "realizado" só aceita novoStatus agendado ou confirmado, nunca cancelado', async () => {
      const created = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-25T10:00:00.000Z',
            dataHoraFim: '2026-09-25T11:00:00.000Z',
          }),
        )
        .expect(201);
      const agendamentoId = (created.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/status`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send({ status: 'realizado' })
        .expect(200);

      const tentandoCancelar = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({
          novoStatus: 'cancelado',
          motivo: 'Tentando cancelar via reverter, não deveria ser aceito',
        });
      expect(tentandoCancelar.status).toBe(400);

      const revertendoParaAgendado = await request(app.getHttpServer())
        .patch(`/agendamentos/${agendamentoId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({
          novoStatus: 'agendado',
          motivo: 'Atendimento marcado como realizado por engano',
        });
      expect(revertendoParaAgendado.status).toBe(200);
      expect(
        (revertendoParaAgendado.body as AgendamentoResponseBody).status,
      ).toBe('agendado');
    });

    it('reverter falha por choque de horário se o horário foi ocupado enquanto o agendamento estava cancelado', async () => {
      const primeiro = await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-26T10:00:00.000Z',
            dataHoraFim: '2026-09-26T11:00:00.000Z',
          }),
        )
        .expect(201);
      const primeiroId = (primeiro.body as AgendamentoResponseBody).id;

      await request(app.getHttpServer())
        .patch(`/agendamentos/${primeiroId}/cancelar`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .expect(200);

      // Horário livre (o primeiro está cancelado) — outro agendamento ocupa.
      await request(app.getHttpServer())
        .post('/agendamentos')
        .set('Host', hostFor(org.slug))
        .set('Cookie', ownerSessionCookie)
        .send(
          agendamentoInput({
            dataHoraInicio: '2026-09-26T10:00:00.000Z',
            dataHoraFim: '2026-09-26T11:00:00.000Z',
          }),
        )
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/agendamentos/${primeiroId}/reverter`)
        .set('Host', hostFor(org.slug))
        .set('Cookie', adminSessionCookie)
        .send({
          novoStatus: 'agendado',
          motivo: 'Tentando reverter um horário que já foi ocupado',
        });

      expect(response.status).toBe(409);
    });
  });

  it('401 sem sessão nenhuma', async () => {
    const response = await request(app.getHttpServer())
      .get('/agendamentos')
      .set('Host', hostFor(org.slug));

    expect(response.status).toBe(401);
  });
});
