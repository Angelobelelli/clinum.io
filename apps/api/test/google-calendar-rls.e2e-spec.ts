import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infra/database/prisma.service';
import { tenantScopedPrismaClient } from '@/infra/database/tenant-scoped-prisma-client';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';

/**
 * Prova que a RLS de "google_calendar_connection" funciona por si só,
 * independente da camada de aplicação — mesmo padrão de
 * patients-rls.e2e-spec.ts/agendamentos-rls.e2e-spec.ts.
 */
describe('RLS pura em google_calendar_connection (sem passar pela camada de aplicação) (e2e)', () => {
  let prisma: PrismaService;
  let org: { id: string };
  let memberId: string;
  let connectionId: string;

  beforeAll(async () => {
    await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = new PrismaService();
    await prisma.onModuleInit();

    org = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org Google Calendar RLS (teste)',
        slug: `org-gcal-rls-${randomUUID().slice(0, 8)}`,
      },
    });

    const user = await prisma.db.user.create({
      data: {
        id: randomUUID(),
        name: 'Profissional RLS',
        email: `profissional-rls-${randomUUID().slice(0, 8)}@example.com`,
      },
    });
    const member = await prisma.db.member.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        userId: user.id,
        role: 'staff',
        createdAt: new Date(),
      },
    });
    memberId = member.id;

    const created = await runWithTenantContext(
      { organizationId: org.id },
      async () =>
        tenantScopedPrismaClient.googleCalendarConnection.create({
          data: {
            memberId,
            googleAccountEmail: 'profissional@example.com',
            refreshTokenEncrypted: 'v1:qualquer-coisa-nao-eh-decriptada-aqui',
          },
        }),
    );
    connectionId = created.id;
  });

  afterAll(async () => {
    await prisma.db.googleCalendarConnection.deleteMany({
      where: { id: connectionId },
    });
    await prisma.db.member.deleteMany({ where: { id: memberId } });
    await prisma.db.organization.delete({ where: { id: org.id } });
    await prisma.onModuleDestroy();
    await tenantScopedPrismaClient.$disconnect();
  });

  it('bloqueia SQL cru sem app.current_organization_id setado', async () => {
    const rows = await tenantScopedPrismaClient.$queryRaw<{ id: string }[]>`
      SELECT id FROM "google_calendar_connection" WHERE id = ${connectionId}
    `;
    expect(rows).toHaveLength(0);
  });

  it('bloqueia SQL cru com app.current_organization_id de outro tenant', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${randomUUID()}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "google_calendar_connection" WHERE id = ${connectionId}`,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('permite SQL cru com app.current_organization_id correto', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${org.id}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "google_calendar_connection" WHERE id = ${connectionId}`,
    ]);
    expect(rows).toHaveLength(1);
  });
});
