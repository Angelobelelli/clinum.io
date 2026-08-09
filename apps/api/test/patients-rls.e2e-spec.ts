import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma.service';
import { tenantScopedPrismaClient } from '../src/infra/database/tenant-scoped-prisma-client';
import { runWithTenantContext } from '../src/infra/tenant/tenant-context';

/**
 * Prova que a Row-Level Security da tabela "patient" funciona por si só,
 * INDEPENDENTE da camada de aplicação (prisma-tenant.extension.ts) — ou
 * seja, mesmo se alguém rodar SQL cru direto (bypassando a extension, ver
 * abaixo), o Postgres ainda recusa ler linhas de outro tenant.
 *
 * `$queryRaw`/`$executeRaw` chamados diretamente (fora de
 * tenantScopedPrismaClient.patient.*) NÃO passam pelo hook
 * `$allOperations` da extension (esse só intercepta operações de model,
 * ver prisma-tenant.extension.ts) — por isso servem aqui como um "cliente
 * malicioso simulado" que ignora a camada 1 de propósito.
 */
describe('RLS pura em patient (sem passar pela camada de aplicação) (e2e)', () => {
  let prisma: PrismaService;
  let org: { id: string };
  let patientId: string;

  beforeAll(async () => {
    await Test.createTestingModule({ imports: [AppModule] }).compile();
    // Não precisa subir a app HTTP pra este teste — só o client Prisma.
    prisma = new PrismaService();
    await prisma.onModuleInit();

    org = await prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: 'Org RLS pura (teste)',
        slug: `org-rls-pura-${randomUUID().slice(0, 8)}`,
      },
    });

    const created = await runWithTenantContext(
      { organizationId: org.id },
      async () =>
        tenantScopedPrismaClient.patient.create({
          data: { nome: 'Paciente RLS pura' },
        }),
    );
    patientId = created.id;
  });

  afterAll(async () => {
    await prisma.db.patient.deleteMany({ where: { id: patientId } });
    await prisma.db.organization.delete({ where: { id: org.id } });
    await prisma.onModuleDestroy();
    await tenantScopedPrismaClient.$disconnect();
  });

  it('bloqueia SQL cru sem app.current_organization_id setado', async () => {
    const rows = await tenantScopedPrismaClient.$queryRaw<{ id: string }[]>`
      SELECT id FROM "patient" WHERE id = ${patientId}
    `;
    expect(rows).toHaveLength(0);
  });

  it('bloqueia SQL cru com app.current_organization_id de outro tenant', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${randomUUID()}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "patient" WHERE id = ${patientId}`,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('permite SQL cru com app.current_organization_id correto', async () => {
    const [, rows] = await tenantScopedPrismaClient.$transaction([
      tenantScopedPrismaClient.$executeRaw`SELECT set_config('app.current_organization_id', ${org.id}, true)`,
      tenantScopedPrismaClient.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "patient" WHERE id = ${patientId}`,
    ]);
    expect(rows).toHaveLength(1);
  });
});
