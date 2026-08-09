import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infra/database/prisma.service';
import { tenantScopedPrismaClient } from '@/infra/database/tenant-scoped-prisma-client';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';

/**
 * Prova que a Row-Level Security da tabela "agendamento" funciona por si
 * só, INDEPENDENTE da camada de aplicação (prisma-tenant.extension.ts) —
 * mesmo padrão de patients-rls.e2e-spec.ts (ver comentário lá para o
 * racional completo de por que $queryRaw/$executeRaw servem aqui como um
 * "cliente malicioso simulado").
 */
describe('RLS pura em agendamento (sem passar pela camada de aplicação) (e2e)', () => {
  let prisma: PrismaService;
  let org: { id: string };
  let userId: string;
  let memberId: string;
  let patientId: string;
  let agendamentoId: string;

  beforeAll(async () => {
    await Test.createTestingModule({ imports: [AppModule] }).compile();
    // Não precisa subir a app HTTP pra este teste — só o client Prisma.
    prisma = new PrismaService();
    await prisma.onModuleInit();

    org = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org RLS pura agendamento (teste)',
        slug: `org-rls-agenda-${randomUUID().slice(0, 8)}`,
      },
    });

    userId = randomUUID();
    await prisma.db.user.create({
      data: {
        id: userId,
        name: 'Profissional RLS pura',
        email: `profissional-rls-${randomUUID().slice(0, 8)}@test.local`,
      },
    });

    memberId = randomUUID();
    await prisma.db.member.create({
      data: {
        id: memberId,
        organizationId: org.id,
        userId,
        role: 'staff',
        createdAt: new Date(),
      },
    });

    const patient = await runWithTenantContext(
      { organizationId: org.id },
      async () =>
        tenantScopedPrismaClient.patient.create({
          data: { nome: 'Paciente RLS pura agendamento' },
        }),
    );
    patientId = patient.id;

    const agendamento = await runWithTenantContext(
      { organizationId: org.id },
      async () =>
        tenantScopedPrismaClient.agendamento.create({
          data: {
            patientId,
            profissionalId: memberId,
            dataHoraInicio: new Date('2026-10-01T10:00:00.000Z'),
            dataHoraFim: new Date('2026-10-01T11:00:00.000Z'),
          },
        }),
    );
    agendamentoId = agendamento.id;
  });

  afterAll(async () => {
    await prisma.db.agendamento.deleteMany({ where: { id: agendamentoId } });
    await prisma.db.patient.deleteMany({ where: { id: patientId } });
    await prisma.db.member.deleteMany({ where: { id: memberId } });
    await prisma.db.organization.delete({ where: { id: org.id } });
    await prisma.db.user.delete({ where: { id: userId } });
    await prisma.onModuleDestroy();
    await tenantScopedPrismaClient.$disconnect();
  });

  it('bloqueia SQL cru sem app.current_organization_id setado', async () => {
    const rows = await tenantScopedPrismaClient.$queryRaw<{ id: string }[]>`
      SELECT id FROM "agendamento" WHERE id = ${agendamentoId}
    `;
    expect(rows).toHaveLength(0);
  });

  it('bloqueia SQL cru com app.current_organization_id de outro tenant', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${randomUUID()}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "agendamento" WHERE id = ${agendamentoId}`,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('permite SQL cru com app.current_organization_id correto', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${org.id}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "agendamento" WHERE id = ${agendamentoId}`,
    ]);
    expect(rows).toHaveLength(1);
  });
});
