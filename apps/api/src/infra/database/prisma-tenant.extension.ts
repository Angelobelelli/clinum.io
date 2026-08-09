import { Prisma } from '@generated/prisma/client';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';

/**
 * Models de negócio que possuem a coluna `organizationId` e que, portanto,
 * devem ter esse valor injetado/filtrado automaticamente.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  'Patient',
  'PatientHealthRecord',
  'Agendamento',
  'AgendamentoAuditLog',
  'Servico',
]);

const FILTERABLE_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  // findUnique/findUniqueOrThrow: confirmado empiricamente que o Prisma 7
  // aceita um filtro adicional (não-único) combinado com o identificador
  // único no `where` — ex: findUnique({ where: { id, organizationId } })
  // retorna null se organizationId não bater, em vez de ignorar o filtro.
  // Sem isso aqui, uma busca por ID (ex: findUnique({ where: { id } }))
  // vazaria registros de outro tenant, já que o `where` original nunca
  // seria combinado com organizationId.
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);

/**
 * Prisma Client Extension responsável pelo isolamento de tenant em DUAS
 * camadas, para cada model listado em TENANT_SCOPED_MODELS:
 *
 *   1. Camada de aplicação: injeta `organizationId` automaticamente em
 *      `create`/`createMany`, e no `where` de toda leitura/atualização/
 *      exclusão. O organizationId sempre vem de getCurrentTenantId()
 *      (AsyncLocalStorage populado pelo TenantMiddleware) — nunca de input
 *      do cliente, para que não seja possível manipular a query pra ler/
 *      escrever em outro tenant.
 *
 *   2. Camada de banco (Row-Level Security, ver prisma/rls-policies.sql):
 *      toda operação num model tenant-scoped roda dentro de uma transação
 *      que primeiro seta `app.current_organization_id` via
 *      `set_config(..., true)` (o `true` = "is_local", equivalente a
 *      `SET LOCAL`) e só depois roda a query de verdade — as duas na MESMA
 *      transação/conexão, usando a forma sequencial de `$transaction([...])`
 *      (não a forma de callback interativo: `query(args)` retorna um
 *      `PrismaPromise`, que o `$transaction([...])` sequencial consegue
 *      agrupar na mesma transação sem precisar rebindar `query` a um client
 *      `tx` — a API de extensions não permite isso diretamente).
 *
 *      Isso só tem efeito de verdade porque a conexão usada aqui
 *      (APP_DATABASE_URL, ver tenant-scoped-prisma-client.ts) é um role
 *      Postgres RESTRITO, sem SUPERUSER (ver
 *      docker-init/create-app-role.sh) — superusuário sempre ignora RLS,
 *      então isso ficaria inerte se conectasse como o usuário de
 *      migrations/CLI.
 */
export const prismaTenantExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const organizationId = getCurrentTenantId();
          const scopedArgs = args as Record<string, unknown>;

          if (operation === 'create') {
            scopedArgs.data = {
              ...(scopedArgs.data as object),
              organizationId,
            };
          } else if (
            operation === 'createMany' &&
            Array.isArray(scopedArgs.data)
          ) {
            scopedArgs.data = (scopedArgs.data as object[]).map((item) => ({
              ...item,
              organizationId,
            }));
          } else if (FILTERABLE_OPERATIONS.has(operation)) {
            scopedArgs.where = {
              ...(scopedArgs.where as object),
              organizationId,
            };
          }

          const [, result] = await client.$transaction([
            client.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`,
            query(scopedArgs),
          ]);

          return result;
        },
      },
    },
  }),
);

/**
 * EXEMPLO — habilitando as duas camadas de isolamento para um novo model de
 * negócio:
 *
 * 1. No schema.prisma, garanta a coluna organizationId + relação:
 *
 *    model Appointment {
 *      id             String       @id @default(cuid())
 *      organizationId String
 *      organization   Organization @relation(fields: [organizationId], references: [id])
 *      // ...demais campos
 *
 *      @@index([organizationId])
 *    }
 *
 * 2. Adicione o nome do model a TENANT_SCOPED_MODELS no topo deste arquivo.
 *
 * 3. Adicione a RLS policy correspondente em prisma/rls-policies.sql
 *    (replique o template documentado lá) e gere a migration com o SQL.
 *
 * 4. Use sempre `tenantScopedPrismaClient` (ver tenant-scoped-prisma-client.ts)
 *    — nunca o `prismaClient`/`PrismaService` crus — para tudo que for desse
 *    model:
 *
 *    await tenantScopedPrismaClient.appointment.create({ data: { ... } });
 *    // organizationId é injetado automaticamente a partir do tenant atual.
 *
 *    await tenantScopedPrismaClient.appointment.findMany();
 *    // equivalente a: findMany({ where: { organizationId: <tenant atual> } })
 *
 * Ver Patient/PatientHealthRecord (modules/patients/) e Agendamento
 * (modules/agenda/) como exemplos reais já em produção desse padrão.
 */
